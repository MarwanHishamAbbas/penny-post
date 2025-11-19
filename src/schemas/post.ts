import z from 'zod';

export const postQuerySchema = z.object({
  page: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['published', 'draft']).default('published'),
});

export const getPostParams = z.object({
  id: z.string().min(0, 'Post ID is required'),
});
