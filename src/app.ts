import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { analyzeDeck, analyzeCard } from './controllers/aiController';
import { authMiddleware } from './middleware/auth';
import { deckAnalysisLimiter, cardAnalysisLimiter, generalLimiter } from './middleware/rateLimiter';

const app = express();

// Improved CORS configuration
const allowedOrigins = [
  'https://handtrap.vercel.app',
  'https://handtrap.xyz'
];

// Allow localhost only in development
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:5173');
  allowedOrigins.push('http://localhost:3000');
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const user = (req as any).user?.uid || 'unauthenticated';
  console.log(`[${timestamp}] ${req.method} ${req.path} - User: ${user} - IP: ${req.ip}`);
  next();
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Public routes (no authentication required)
app.get('/', (req, res) => {
  res.send('Master Duel AI Backend is running! 🚀');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Protected routes (require authentication + specific rate limits)
app.post('/analyze', authMiddleware, deckAnalysisLimiter, analyzeDeck);
app.post('/analyze-card', authMiddleware, cardAnalysisLimiter, analyzeCard);

export default app;