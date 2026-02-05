import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Middleware factory for validating request body against a Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated; // Replace with validated/sanitized data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: formattedErrors
        });
      }
      
      // Unexpected error
      console.error('Validation middleware error:', error);
      return res.status(500).json({
        error: 'Internal Error',
        message: 'Failed to validate request'
      });
    }
  };
};

