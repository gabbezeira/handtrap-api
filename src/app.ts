import dotenv from 'dotenv';
// Load env vars immediately
dotenv.config();

import express from 'express';
import cors from 'cors';
import { analyzeDeck, analyzeCard } from './controllers/aiController';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// AI Deck Analysis Route
app.post('/api/analyze', analyzeDeck);
app.post('/api/analyze-card', analyzeCard);

export default app;
