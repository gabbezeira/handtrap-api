import dotenv from 'dotenv';
// Load env vars immediately
dotenv.config();

import express from 'express';
import cors from 'cors';
import { analyzeDeck, analyzeCard } from './controllers/aiController';

const app = express();

app.use(cors({
  origin: [
    'https://handtrap.vercel.app',
    'https://handtrap.xyz',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Master Duel AI Backend is running! 🚀');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.post('/analyze', analyzeDeck);
app.post('/analyze-card', analyzeCard);

export default app;