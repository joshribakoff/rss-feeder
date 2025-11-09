import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized', message: 'Please log in to access this resource' });
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Just pass through, but passport will still deserialize the user if session exists
  next();
}
