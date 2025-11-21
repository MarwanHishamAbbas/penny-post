import {
  createPost,
  deletePost,
  getAllPosts,
  getPostById,
  updatePost,
} from '@/controllers/posts';
import { validate } from '@/middlewares/validate';
import {
  createPostSchema,
  getPostParamsSchema,
  postQuerySchema,
  updatePostSchema,
} from '@/schemas/post';
import { Router } from 'express';

const router = Router();

router.get('/', validate(postQuerySchema, 'query'), getAllPosts);
router.get('/:id', validate(getPostParamsSchema, 'params'), getPostById);

router.post('/create', validate(createPostSchema, 'body'), createPost);
router.put(
  '/update/:id',
  validate(getPostParamsSchema, 'params'),
  validate(updatePostSchema, 'body'),
  updatePost,
);
router.delete(
  '/delete/:id',
  validate(getPostParamsSchema, 'params'),
  deletePost,
);

export default router;
