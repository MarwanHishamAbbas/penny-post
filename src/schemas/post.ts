import z from 'zod';

export const postQuerySchema = z.object({
  search: z.string(),
  status: z.enum(['published', 'draft']).default('published'),
  cursor: z.string().optional(),
  is_featured: z.string().optional().default('false'),
});

export const getPostParamsSchema = z.object({
  id: z.string().min(0, 'Post ID is required'),
});

export const createPostSchema = z.object(
  {
    title: z.string().min(1, 'Title is required'),
    category_id: z.number().int().positive().min(0, 'Category is required'),
    overview: z
      .string({ error: 'Overview is required' })
      .min(1, 'Overview is required'),
    content: z
      .string()
      .min(5, { message: 'Content must be at least 5 characters long' }),
    author_id: z.number().int().positive(),
  },
  { error: 'Body is required' },
);

export const updatePostSchema = createPostSchema.partial();
