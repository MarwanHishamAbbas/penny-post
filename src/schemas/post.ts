import z from 'zod';

export const postQuerySchema = z.object({
  page: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['published', 'draft']).default('published'),
});

export const getPostParamsSchema = z.object({
  id: z.string().min(0, 'Post ID is required'),
});

export const createPostSchema = z.object(
  {
    title: z.string({ error: 'Title is required' }),
    content: z
      .string()
      .min(5, { message: 'Content must be at least 5 characters long' }),
    author: z.string({ error: 'Author is required' }),
  },
  { error: 'Body is required' },
);

export const updatePostSchema = createPostSchema.partial();
