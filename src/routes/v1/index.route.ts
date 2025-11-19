import { Router } from 'express';
import statsRouter from './stats.route';
import postsRouter from './posts.route';
import { errorHandler } from '@/middlewares/error';

const router = Router();

router.use('/stats', statsRouter);
router.use('/posts', postsRouter);

router.use(errorHandler);

export default router;
