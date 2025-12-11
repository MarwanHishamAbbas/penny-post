import { Request, Response, NextFunction } from 'express';

import { HttpStatus } from '@/lib/status-codes';
import { SessionService } from '@/services/session';
import logger from '@/lib/winston';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: any;
      sessionToken?: string;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Get session token from cookie
    // 🔴 OPTIONS requests don't have cookies - skip authentication
    if (req.method === 'OPTIONS') {
      return next();
    }

    // Get session token from cookie
    const sessionToken = req.cookies?.session_token;
    // logger.debug('Session Token / Authenticate Middleware: ', sessionToken);

    if (!sessionToken) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Authentication required',
        code: 'NO_SESSION_TOKEN',
      });
      return;
    }

    // Validate session token
    const user = await SessionService.validateSession(sessionToken);

    if (!user) {
      // Clear invalid session cookie
      // SessionService.clearAuthCookies(res);
      res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Session expired or invalid',
        code: 'INVALID_SESSION',
      });
      return;
    }

    // Attach user to request
    req.user = user;
    req.sessionToken = sessionToken;

    next();
  } catch (error) {
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
};

export const requireVerifiedEmail = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    res.status(HttpStatus.UNAUTHORIZED).json({
      message: 'Authentication required',
    });
    return;
  }

  if (!req.user.email_verified) {
    res.status(HttpStatus.FORBIDDEN).json({
      message: 'Please verify your email address to access this resource',
      code: 'EMAIL_NOT_VERIFIED',
    });
    return;
  }

  next();
};
