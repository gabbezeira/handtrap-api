import crypto from 'crypto';

export const generateDeckHash = (cards: number[]): string => {
  // Sort cards to ensure consistent hash regardless of order
  const sortedCards = [...cards].sort((a, b) => a - b);
  const data = JSON.stringify(sortedCards);
  
  // Create SHA-256 hash
  return crypto.createHash('sha256').update(data).digest('hex');
};
