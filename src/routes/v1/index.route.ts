import { Router } from 'express';
import statsRouter from './stats.route';

const router = Router();

router.use('/stats', statsRouter);

export default router;
