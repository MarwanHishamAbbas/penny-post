import { Router } from 'express';
import statsRouter from './stats.route';
import postsRouter from './posts.route';
import authRouter from './auth.route';
import { errorHandler } from '@/middlewares/error';

const router = Router();

router.use('/stats', statsRouter);
router.use('/auth', authRouter);
router.use('/posts', postsRouter);

router.use(errorHandler);

export default router;
