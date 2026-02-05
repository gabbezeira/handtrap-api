import { Request, Response } from 'express';
import { GeminiService } from '../services/geminiService';
import admin from '../config/firebase-admin';
import { generateDeckHash } from '../utils/hashUtils';

const geminiService = new GeminiService();
const db = admin.firestore();
const isProduction = process.env.NODE_ENV === 'production';

type PlanType = 'free' | 'premium';

const PLAN_LIMITS = {
  free: { deck: 1, hand: 3, card: 5 },
  premium: { deck: 3, hand: 5, card: 10 }
};

/**
 * Helper to get user plan and limits
 */
const getUserContext = async (userId: string) => {
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  
  // Default to free if no subscription or status is not active
  let plan: PlanType = 'free';
  if (userData?.subscription?.status === 'active' && userData?.subscription?.plan === 'premium') {
    plan = 'premium';
  }

  return { plan, limits: PLAN_LIMITS[plan] };
};

/**
 * Helper to check and increment usage
 */
const checkUsage = async (userId: string, type: 'deck' | 'hand' | 'card', limit: number, increment = false): Promise<boolean> => {
  const userUsageRef = db.collection('users').doc(userId).collection('usage').doc(`${type}_analysis`);
  const today = new Date().toISOString().split('T')[0];
  
  let count = 0;
  
  if (increment) {
    // Atomic increment with day reset check
    return await db.runTransaction(async (t) => {
      const doc = await t.get(userUsageRef);
      const data = doc.data();
      
      if (doc.exists && data?.date === today) {
        count = data.count || 0;
      } else {
        count = 0; // Reset for new day
      }

      if (count >= limit) return false; // Limit reached

      const newData = { date: today, count: count + 1 };
      t.set(userUsageRef, newData);
      return true;
    });
  } else {
    // Just read
    const doc = await userUsageRef.get();
    const data = doc.data();
    if (doc.exists && data?.date === today) {
      count = data.count || 0;
    }
    return count < limit;
  }
};

/**
 * Safe error response
 */
import { logger } from '../utils/logger';

const handleError = (res: Response, error: any, publicMessage: string) => {
  logger.error(publicMessage, error);
  return res.status(500).json({ 
    error: publicMessage, 
    details: isProduction ? undefined : error.message 
  });
};

export const analyzeDeck = async (req: Request, res: Response) => {
  try {
    const { deckList, cardIds, forceRefresh } = req.body;
    const userId = (req as any).user?.uid;

    // Generate Hash
    const deckHash = generateDeckHash(cardIds);
    const analysisRef = db.collection('deck_analyses').doc(deckHash);

    // 1. Check Cache
    if (!forceRefresh) {
      const docSnap = await analysisRef.get();
      if (docSnap.exists) {
        logger.perf('Cache hit: deck analysis', { operation: 'analyzeDeck' });
        return res.json({ ...docSnap.data(), source: 'cache', deckHash });
      }
      return res.status(404).json({ error: 'NOT_FOUND', message: 'No analysis found.' });
    }

    // 2. Force Refresh: Logic
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { plan, limits } = await getUserContext(userId);
    
    // Check limit (without incrementing yet to avoid charging for failed calls? 
    // Actually standard is checking first. We will use the transactional helper directly later or similar pattern)
    // To allow atomic check-and-increment only on success is tricky with long AI calls.
    // We stick to "Soft Check -> Run AI -> Transact Increment" or "Transact Increment -> Run AI".
    // "Transact Increment -> Run AI" is safer for quotas but bad UX if AI fails.
    // Let's do: Check value -> Run AI -> Increment. (Graceful failure).
    
    const canProceed = await checkUsage(userId, 'deck', limits.deck, false);
    if (!canProceed) {
      return res.status(403).json({ error: 'LIMIT_REACHED', message: `Daily deck analysis limit reached (${limits.deck}). Upgrade to Premium for 3/day.` });
    }

    // 3. Perform Analysis (Dynamic Model)
    logger.perf('Fresh deck analysis started', { operation: 'analyzeDeck', userId });
    const analysis = await geminiService.analyzeDeck(deckList, plan);

    // 4. Save Cache & Increment Usage
    const batch = db.batch();
    
    batch.set(analysisRef, {
      ...analysis,
      timestamp: new Date(),
      cardIds: cardIds.sort((a: number, b: number) => a - b),
      deckList,
      generatedByPlan: plan
    });

    // We manually increment here inside the main flow, or use the helper with increment=true?
    // Let's use specific logic for the usage doc to match atomic needs or just simple write since we checked earlier.
    const userUsageRef = db.collection('users').doc(userId).collection('usage').doc('deck_analysis');
    const today = new Date().toISOString().split('T')[0];
    const usageSnap = await userUsageRef.get();
    
    if (!usageSnap.exists || usageSnap.data()?.date !== today) {
      batch.set(userUsageRef, { date: today, count: 1 });
    } else {
      batch.update(userUsageRef, { count: admin.firestore.FieldValue.increment(1) });
    }

    await batch.commit();

    res.json({ ...analysis, source: 'fresh', deckHash, planUsed: plan });

  } catch (error: any) {
    return handleError(res, error, 'Failed to analyze deck');
  }
};

import { createHash } from 'crypto';

// ... (imports)

export const analyzeCard = async (req: Request, res: Response) => {
  try {
    const { cardName } = req.body;
    const userId = (req as any).user?.uid;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Generate Consistent Hash (SHA-256)
    const cardHash = createHash('sha256').update(cardName).digest('hex');
    const analysisRef = db.collection('card_analyses').doc(cardHash);

    // 2. Check Backend Cache
    const docSnap = await analysisRef.get();
    if (docSnap.exists) {
        logger.perf('Cache hit: card analysis', { operation: 'analyzeCard' });
        // We do NOT charge quota for cached reads? 
        // Decision: Let's NOT charge quota for cached hits to encourage exploration, 
        // OR charge to maintain value. 
        // Given the goal is "Viabilizar Custos", FREE cache hits are great UX and cost us nothing.
        // Let's Skip Quota Check for Cache Hits!
        return res.json({ ...docSnap.data(), source: 'cache', cardHash });
    }

    const { plan, limits } = await getUserContext(userId);

    // 3. Limit Check (Only for Fresh Generation)
    const processed = await checkUsage(userId, 'card', limits.card, true); 
    if (!processed) {
        return res.status(403).json({ error: 'LIMIT_REACHED', message: `Daily card analysis limit reached (${limits.card}).` });
    }

    // 4. Generate Fresh Analysis (Flash Model forced in Service)
    logger.perf('Fresh card analysis started', { operation: 'analyzeCard', userId });
    const analysis = await geminiService.analyzeCard(cardName, plan);

    // 5. Save to Global Cache
    await analysisRef.set({
        ...analysis,
        timestamp: new Date(),
        cardName,
        generatedByPlan: plan
    });

    res.json({ ...analysis, source: 'fresh', cardHash });

  } catch (error: any) {
    return handleError(res, error, 'Failed to analyze card');
  }
};

export const analyzeHand = async (req: Request, res: Response) => {
  try {
    const { handCards, deckList } = req.body;
    const userId = (req as any).user?.uid;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { plan, limits } = await getUserContext(userId);

    // Check Usage (Read only)
    const canProceed = await checkUsage(userId, 'hand', limits.hand, false);
    if (!canProceed) {
      return res.status(403).json({ error: 'LIMIT_REACHED', message: `Daily hand analysis limit reached (${limits.hand}).` });
    }

    // Call AI
    const analysis = await geminiService.analyzeHand(handCards, deckList, plan);

    // Increment Usage (Pay after delivery)
    const userUsageRef = db.collection('users').doc(userId).collection('usage').doc('hand_analysis');
    const today = new Date().toISOString().split('T')[0];
    const snap = await userUsageRef.get();
    
    if (!snap.exists || snap.data()?.date !== today) {
       await userUsageRef.set({ date: today, count: 1 });
    } else {
       await userUsageRef.update({ count: admin.firestore.FieldValue.increment(1) });
    }

    res.json(analysis);

  } catch (error: any) {
    return handleError(res, error, 'Failed to analyze hand');
  }
};
