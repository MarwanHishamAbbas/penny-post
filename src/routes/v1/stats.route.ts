import { HttpStatus } from '@/lib/status-codes';
import { Request, Response, Router } from 'express';

const router = Router();

router.get('/health', async (req: Request, res: Response) => {
  res.status(HttpStatus.OK).json({
    message: 'API is live',
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
