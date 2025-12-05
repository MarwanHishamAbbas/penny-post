import { getAllPosts, getPostById } from '@/controllers/posts';
import { validate } from '@/middlewares/validate';
import { getPostParamsSchema, postQuerySchema } from '@/schemas/post';
import { Router } from 'express';

const router = Router();

router.get('/', getAllPosts);
router.get('/:id', validate(getPostParamsSchema, 'params'), getPostById);

export default router;
