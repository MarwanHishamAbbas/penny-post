import { HttpStatus } from '@/lib/status-codes';
import { Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Rate limiting

// Login rate limiter
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => {
    // Use IP + email for more accurate limiting
    const email = req.body?.email || 'unknown';
    return ipKeyGenerator(`${req.ip}-${email}`);
  },

  handler: (req: Request, res: Response) => {
    res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      message: 'Too many login attempts. Please try again in 15 minutes.',
      code: 'RATE_LIMITED',
    });
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

export const verificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 requests per hour
  message: 'Too many verification attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many verification attempts, please try again later.',
    });
  },
});

// Refresh token rate limiter
export const refreshRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 refresh attempts per window
  message: 'Too many refresh attempts. Please login again.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) =>
    ipKeyGenerator(`${req.ip}`) || ipKeyGenerator('unknown'),
  handler: (req: Request, res: Response) => {
    res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      message: 'Too many refresh attempts. Please login again.',
      code: 'RATE_LIMITED',
    });
  },
});
