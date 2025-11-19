import { pool } from '@/lib/database';
import logger from '@/lib/winston';
import { asyncHandler } from '@/middlewares/async-handler';
import { AppError } from '@/middlewares/error';
import { getPostParams, postQuerySchema } from '@/schemas/post';
import { Request, Response } from 'express';

export const getAllPosts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    let { search, page, status } = postQuerySchema.parse(req.query);

    const limit = 5;
    page = page ? page : '0';

    let whereClause = '';
    let params: any[] = [parseInt(page) * 5, limit, `%${status}%`];

    if (search) {
      whereClause = `title ILIKE $2 AND`;
      params.push(`%${search}%`);
    }

    const { rows } = await pool.query(
      `SELECT *, COUNT(*) OVER()::INTEGER as total_count 
       FROM posts 
       WHERE ${whereClause} status LIKE $3
       OFFSET $1
       LIMIT $2`,
      params,
    );

    res.status(200).json({
      total: rows.length > 0 ? rows[0].total_count : 0,
      rows: rows.map(({ total_count, ...post }) => post),
      limit,
      page,
    });
  },
);

export const getPostById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = getPostParams.parse(req.params);
    const { rows } = await pool.query(
      `
      SELECT *
      FROM posts
      WHERE id = $1
      `,
      [id],
    );
    if (rows.length === 0) {
      logger.error("Couldn't find a post with this id");
      throw new AppError('Blog post not found', 404);
    }
    res.status(200).json({
      rows: rows[0],
    });
  },
);
