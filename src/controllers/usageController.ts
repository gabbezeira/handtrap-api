import { Request, Response } from 'express';
import { db } from '../config/firebase-admin';
import { logger } from '../utils/logger';


const TOKEN_PRICES = {
  'gemini-2.5-pro': { input: 1.25, output: 10.00 },
  'gemini-2.5-flash': { input: 0.30, output: 2.50 }
};

interface UsageStats {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCalls: number;
  byOperation: Record<string, { calls: number; cost: number; tokens: number }>;
  byModel: Record<string, { calls: number; cost: number; tokens: number }>;
}

/**
 * Get API usage statistics for admin dashboard
 */
export const getApiUsageStats = async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period as string) || 30;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);
    
    const snapshot = await db.collection('api_usage')
      .where('timestamp', '>=', startDate)
      .orderBy('timestamp', 'desc')
      .get();
    
    const stats: UsageStats = {
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCalls: 0,
      byOperation: {},
      byModel: {}
    };
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const cost = data.estimatedCostUSD || 0;
      const inputTokens = data.inputTokens || 0;
      const outputTokens = data.outputTokens || 0;
      const operation = data.operation || 'unknown';
      const model = data.model || 'unknown';
      
      stats.totalCost += cost;
      stats.totalInputTokens += inputTokens;
      stats.totalOutputTokens += outputTokens;
      stats.totalCalls++;
      

      if (!stats.byOperation[operation]) {
        stats.byOperation[operation] = { calls: 0, cost: 0, tokens: 0 };
      }
      stats.byOperation[operation].calls++;
      stats.byOperation[operation].cost += cost;
      stats.byOperation[operation].tokens += inputTokens + outputTokens;
      

      if (!stats.byModel[model]) {
        stats.byModel[model] = { calls: 0, cost: 0, tokens: 0 };
      }
      stats.byModel[model].calls++;
      stats.byModel[model].cost += cost;
      stats.byModel[model].tokens += inputTokens + outputTokens;
    });
    
    logger.info('API usage stats fetched', { operation: 'getApiUsageStats' });
    
    res.json({
      period: `${daysAgo} days`,
      ...stats,
      pricing: TOKEN_PRICES
    });
  } catch (error: any) {
    logger.error('Failed to fetch API usage stats', error);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
};
