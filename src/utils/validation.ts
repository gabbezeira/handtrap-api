import { z } from 'zod';

// Schema for deck analysis request
export const analyzeDeckSchema = z.object({
  deckList: z.array(z.string().min(1).max(100))
    .min(1, 'Deck list cannot be empty')
    .max(80, 'Deck list cannot exceed 80 cards'),
  cardIds: z.array(z.number().int().positive())
    .min(1, 'Card IDs required')
    .max(80, 'Card IDs cannot exceed 80'),
  forceRefresh: z.boolean().optional().default(false)
});

// Schema for card analysis request
export const analyzeCardSchema = z.object({
  cardName: z.string()
    .min(1, 'Card name is required')
    .max(100, 'Card name too long')
    // Allow letters (including accented), numbers, spaces, and common punctuation
    .regex(/^[\p{L}\p{N}\s\-,.'":!?&()@#★☆]+$/u, 'Invalid characters in card name')
});

// Schema for hand analysis request
export const analyzeHandSchema = z.object({
  handCards: z.array(z.string().min(1).max(100))
    .length(5, 'Hand must contain exactly 5 cards'),
  deckList: z.array(z.string().min(1).max(100))
    .min(1, 'Deck context is required')
    .max(80, 'Deck list cannot exceed 80 cards')
});

// Schema for feedback submission
export const feedbackSchema = z.object({
  deckHash: z.string()
    .min(10, 'Invalid deck hash')
    .max(128, 'Invalid deck hash'),
  vote: z.enum(['accurate', 'inaccurate']),
  reason: z.string()
    .min(5, 'Reason must be at least 5 characters')
    .max(500, 'Reason too long')
});

// Type exports for use in controllers
export type AnalyzeDeckInput = z.infer<typeof analyzeDeckSchema>;
export type AnalyzeCardInput = z.infer<typeof analyzeCardSchema>;
export type AnalyzeHandInput = z.infer<typeof analyzeHandSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
