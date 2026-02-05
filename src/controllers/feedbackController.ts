import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';

const isProduction = process.env.NODE_ENV === 'production';

export const submitAnalysisFeedback = async (req: Request, res: Response) => {
  try {
    // Body already validated by middleware
    const { deckHash, vote, reason } = req.body;
    const userId = (req as any).user?.uid;
    const userName = (req as any).user?.name || 'Anonymous';

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const feedbackRef = db.collection('deck_analyses').doc(deckHash).collection('feedback').doc(userId);
    
    await feedbackRef.set({
      userId,
      userName,
      vote,
      reason,
      timestamp: new Date()
    });

    res.json({ message: 'Feedback submitted successfully' });

  } catch (error: any) {
    console.error('Feedback Submission Error:', error.message || error);
    res.status(500).json({ 
      error: 'Failed to submit feedback',
      details: isProduction ? undefined : error.message
    });
  }
};
