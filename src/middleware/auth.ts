import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebase-admin';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        [key: string]: any;
      };
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Não autorizado',
        message: 'Token de autenticação ausente' 
      });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await auth.verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email
      };
      next();
    } catch (error: any) {
      console.error('Token verification failed:', error.message);
      return res.status(401).json({ 
        error: 'Não autorizado',
        message: 'Token inválido ou expirado' 
      });
    }
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Erro de autenticação',
      message: 'Erro interno ao verificar autenticação' 
    });
  }
};
