import { Request, Response, NextFunction } from 'express';
import { HttpStatus } from '@/lib/status-codes';

interface LoginRequest extends Request {
  user: { email_verified: boolean };
}

export const requireVerifiedEmail = async (
  req: LoginRequest,
  res: Response,
  next: NextFunction,
) => {
  // Assuming user is attached to request after authentication
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
