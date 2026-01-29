import { Request, Response } from 'express';
import { GeminiService } from '../services/geminiService';

const geminiService = new GeminiService();

export const analyzeDeck = async (req: Request, res: Response) => {
  try {
      const { deckList } = req.body;
      if (!deckList || deckList.length === 0) {
          return res.status(400).json({ error: 'Deck list is empty' });
      }

      
      // Calculate total cards for better logging
      const totalCards = deckList.reduce((acc: number, item: string) => {
          const match = item.match(/^(\d+)x/);
          return acc + (match ? parseInt(match[1]) : 1);
      }, 0);

      console.log(`Analyzing deck with ${totalCards} cards (${deckList.length} unique entries)...`);
      const analysis = await geminiService.analyzeDeck(deckList);
      
      res.json(analysis);

  } catch (error: any) {
      console.error('AI Deck Analysis Error:', error);
      res.status(500).json({ 
          error: 'Failed to analyze deck', 
          details: error.message 
      });
  }
};

export const analyzeCard = async (req: Request, res: Response) => {
    try {
        const { cardName } = req.body;
        if (!cardName) return res.status(400).json({ error: 'Card Name required' });

        const analysis = await geminiService.analyzeCard(cardName);
        res.json(analysis);

    } catch (error: any) {
        console.error('AI Card Analysis Error:', error);
        res.status(500).json({ error: 'Failed to analyze card', details: error.message });
    }
};
