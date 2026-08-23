import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService.js';
import { config } from '../config.js';
import type { User } from '@prisma/client';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

const authService = new AuthService();

function extractToken(req: Request): string | undefined {
  let token: string | undefined = req.cookies?.[config.auth.sessionCookieName];
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7).trim();
  }
  return token;
}

/**
 * Middleware that strictly requires authentication.
 * Returns 401 Unauthorized if missing or invalid.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user) {
      return next();
    }
    
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      return;
    }

    const user = await authService.validateSession(token);
    if (!user) {
      res.status(401).json({ success: false, error: { message: 'Invalid or expired session' } });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware that optionally checks for authentication.
 * Never throws 401; simply leaves req.user undefined if no valid session.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user) {
      return next();
    }
    
    const token = extractToken(req);
    if (token) {
      const user = await authService.validateSession(token);
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
}
