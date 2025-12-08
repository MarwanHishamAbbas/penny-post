import { registerUser } from '@/controllers/auth/register';
import { verifyEmail } from '@/controllers/auth/verify-email';
import { validate } from '@/middlewares/validate';
import { registerUserSchema, validateEmailSchema } from '@/schemas/user';
import { Router } from 'express';

const router = Router();

router.post('/register', validate(registerUserSchema, 'body'), registerUser);
router.post(
  '/verify-email',
  validate(validateEmailSchema, 'query'),
  verifyEmail,
);

export default router;
