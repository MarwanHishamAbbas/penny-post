import { getAllTags } from '@/controllers/tags';
import { Router } from 'express';

const router = Router();

router.get('/', getAllTags);

export default router;
