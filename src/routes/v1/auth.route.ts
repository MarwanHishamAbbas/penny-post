import { registerUser } from '@/controllers/auth/register';
import { verifyEmail } from '@/controllers/auth/verify-email';
import { authLimiter, verificationLimiter } from '@/middlewares/rate-limiter';
import { validate } from '@/middlewares/validate';
import { registerUserSchema, validateEmailSchema } from '@/schemas/user';
import { Router } from 'express';

const router = Router();

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

export default router;
