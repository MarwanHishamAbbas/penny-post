import { getAllPosts, getPostById } from '@/controllers/posts/get-all-posts';
import { validate } from '@/middlewares/validate';
import { getPostParams, postQuerySchema } from '@/schemas/post';
import { Router } from 'express';

const router = Router();

router.get('/', validate(postQuerySchema, 'query'), getAllPosts);
router.get('/:id', validate(getPostParams, 'params'), getPostById);

export default router;
