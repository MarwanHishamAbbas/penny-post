import { registerUser } from '@/controllers/users';
import { HttpStatus } from '@/lib/status-codes';
import { validate } from '@/middlewares/validate';
import { registerUserSchema } from '@/schemas/user';
import { Router } from 'express';

const router = Router();

router.post('/register', validate(registerUserSchema, 'body'), registerUser);

export default router;
