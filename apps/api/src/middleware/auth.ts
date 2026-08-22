import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma.js';
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

/**
 * Gets or creates a default local user to bypass authentication.
 */
async function getOrCreateDefaultUser(): Promise<User> {
  const email = 'local_user@agentflow.dev';
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: 'Local User',
        passwordHash: 'none',
      }
    });
  }
  return user;
}

/**
 * Middleware that automatically attaches the default user to the request.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user) {
      next();
      return;
    }
    req.user = await getOrCreateDefaultUser();
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware that automatically attaches the default user to the request.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.user) {
      next();
      return;
    }
    req.user = await getOrCreateDefaultUser();
    next();
  } catch (error) {
    next(error);
  }
}
