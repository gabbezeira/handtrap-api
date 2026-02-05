import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { analyzeDeck, analyzeCard, analyzeHand } from './controllers/aiController';
import { submitAnalysisFeedback } from './controllers/feedbackController';
import { createCheckoutSession, handleWebhook, createBillingPortalSession } from './controllers/stripeController';
import { getApiUsageStats } from './controllers/usageController';
import { authMiddleware } from './middleware/auth';
import { validateBody } from './middleware/validation';
import { deckAnalysisLimiter, cardAnalysisLimiter, generalLimiter } from './middleware/rateLimiter';
import { logger } from './utils/logger';
import { 
  analyzeDeckSchema, 
  analyzeCardSchema, 
  analyzeHandSchema, 
  feedbackSchema 
} from './utils/validation';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for proper IP detection behind Vercel/Cloudflare
app.set('trust proxy', 1);

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false
}));

// Improved CORS configuration
const allowedOrigins = [
  'https://handtrap.vercel.app',
  'https://handtrap.xyz',
  'https://www.handtrap.xyz'
];


if (!isProduction) {
  allowedOrigins.push('http://localhost:5173');
  allowedOrigins.push('http://localhost:3000');
  allowedOrigins.push('http://localhost:5174');
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

// Parse JSON and save raw body for Stripe Webhook verification
app.use(express.json({ 
  limit: '100kb',
  verify: (req, res, buf) => {
    (req as any).rawBody = buf;
  }
}));

app.use((req, res, next) => {
  const user = (req as any).user?.uid;
  logger.request(req.method, req.path, user, req.ip);
  next();
});

app.use(generalLimiter);

app.get('/', (req, res) => {
  res.send('Master Duel AI Backend is running! 🚀');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.post('/api/webhook', handleWebhook);

app.post('/api/analyze', 
  authMiddleware, 
  validateBody(analyzeDeckSchema),
  deckAnalysisLimiter, 
  analyzeDeck
);

app.post('/api/analyze-card', 
  authMiddleware, 
  validateBody(analyzeCardSchema),
  cardAnalysisLimiter, 
  analyzeCard
);

app.post('/api/analyze-hand', 
  authMiddleware, 
  validateBody(analyzeHandSchema),
  cardAnalysisLimiter, 
  analyzeHand
);

app.post('/api/feedback/analysis', 
  authMiddleware, 
  validateBody(feedbackSchema),
  submitAnalysisFeedback
);


app.post('/api/create-checkout-session',
  authMiddleware,
  createCheckoutSession
);

// Stripe Billing Portal (for managing subscription)
app.post('/api/billing-portal',
  authMiddleware,
  createBillingPortalSession
);

// Admin: API Usage Stats (for cost tracking)
app.get('/api/admin/usage',
  authMiddleware,
  getApiUsageStats
);

// Global error handler - hide details in production
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Origin not allowed' 
    });
  }
  

  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: isProduction ? 'An unexpected error occurred' : err.message
  });
});

export default app;