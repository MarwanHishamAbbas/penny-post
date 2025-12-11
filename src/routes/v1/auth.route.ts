import { loginUser } from '@/controllers/auth/login';
import { logoutUser } from '@/controllers/auth/logout';
import { getCurrentUser } from '@/controllers/auth/me';
import { refreshToken } from '@/controllers/auth/refresh';
import { registerUser } from '@/controllers/auth/register';
import { verifyEmail } from '@/controllers/auth/verify-email';
import { authenticate, requireVerifiedEmail } from '@/middlewares/authenticate';
import {
  authLimiter,
  loginRateLimiter,
  refreshRateLimiter,
  verificationLimiter,
} from '@/middlewares/rate-limiter';
import { validate } from '@/middlewares/validate';
import {
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerUserSchema,
  validateEmailSchema,
} from '@/schemas/user';
import { Router } from 'express';

const router = Router();
router.post(
  '/login',
  loginRateLimiter,
  validate(loginSchema, 'body'),
  loginUser,
);

router.post(
  '/refresh',
  validate(refreshSchema, 'body'),
  refreshRateLimiter,
  refreshToken,
);
router.post(
  '/register',
  authLimiter,
  validate(registerUserSchema, 'body'),
  registerUser,
);
router.get(
  '/verify-email',
  verificationLimiter,
  validate(validateEmailSchema, 'query'),
  verifyEmail,
);

// Protected routes (require authentication)
router.use(authenticate);
router.use(requireVerifiedEmail);

router.get('/me', getCurrentUser);
router.post('/logout', validate(logoutSchema, 'body'), logoutUser);

export default router;
