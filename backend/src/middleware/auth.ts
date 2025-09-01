import { Request, Response, NextFunction } from 'express';
import AuthController from '../controllers/authController.js';

/**
 * Middleware to check if user is authenticated
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  console.log('requireAuth middleware called for:', req.path);
  console.log('Authorization header:', req.headers.authorization ? 'present' : 'missing');
  
  if (!AuthController.isAuthenticated(req)) {
    console.log('Authentication failed in middleware');
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please login to access this resource'
    });
    return;
  }

  console.log('Authentication successful in middleware');
  next();
};

/**
 * Middleware to check authentication status (optional auth)
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  // This middleware doesn't block the request, just adds auth info if available
  next();
};

export default { requireAuth, optionalAuth };