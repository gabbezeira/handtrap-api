import rateLimit from 'express-rate-limit';

// Rate limiter for deck analysis (more expensive operation)
export const deckAnalysisLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    error: 'Muitas requisições',
    message: 'Você excedeu o limite de análises de deck. Tente novamente em 1 minuto.',
    retryAfter: '60 segundos'
  },
  standardHeaders: true,
  legacyHeaders: false
  // Uses default IP-based limiting (handles IPv4 and IPv6 correctly)
});

// Rate limiter for card analysis (lighter operation)
export const cardAnalysisLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Muitas requisições',
    message: 'Você excedeu o limite de análises de carta. Tente novamente em 1 minuto.',
    retryAfter: '60 segundos'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter (for other endpoints)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    error: 'Muitas requisições',
    message: 'Você excedeu o limite geral de requisições. Tente novamente mais tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

