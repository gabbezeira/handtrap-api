import dotenv from 'dotenv';
// Load env vars immediately
dotenv.config();

import express from 'express';
import cors from 'cors';
import { analyzeDeck, analyzeCard } from './controllers/aiController';

const app = express();

// CORS Configuration - Allow frontend domains
app.use(cors({
  origin: [
    'https://handtrap.vercel.app',
    'http://localhost:5173',
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

app.post('/api/analyze', analyzeDeck);
app.post('/api/analyze-card', analyzeCard);

export default app;