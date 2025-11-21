import { pool } from '@/lib/database';
import { HttpStatus } from '@/lib/status-codes';
import logger from '@/lib/winston';
import { asyncHandler } from '@/middlewares/async-handler';
import { AppError } from '@/middlewares/error';
import {
  createPostSchema,
  getPostParamsSchema,
  postQuerySchema,
  updatePostSchema,
} from '@/schemas/post';
import { Request, Response } from 'express';

export const getAllPosts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    let { search, page, status } = postQuerySchema.parse(req.query);

    const limit = 5;
    page = page ? page : '0';

    let whereClause = '';
    let params: any[] = [parseInt(page) * 5, limit, `%${status}%`];

    if (search) {
      whereClause = `title ILIKE $4 AND`;
      params.push(`%${search}%`);
    }

    logger.debug(
      `SELECT p.*, a.name, COUNT(*) OVER()::INTEGER as total_count 
       FROM posts p
       INNER JOIN authors a
       ON p.author_id = a.id
       WHERE ${whereClause} status LIKE $3
       OFFSET $1
       LIMIT $2`,
      params,
    );
    const { rows } = await pool.query(
      `SELECT p.*, a.name, COUNT(*) OVER()::INTEGER as total_count 
       FROM posts p
       INNER JOIN authors a
       ON p.author_id = a.id
       WHERE ${whereClause} status LIKE $3
       OFFSET $1
       LIMIT $2`,
      params,
    );

    res.status(HttpStatus.OK).json({
      total: rows.length > 0 ? rows[0].total_count : 0,
      rows: rows.map(({ total_count, ...post }) => post),
      limit,
      page,
    });
  },
);

export const getPostById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = getPostParamsSchema.parse(req.params);
    const { rows } = await pool.query(
      `
      SELECT p.*, a.name
      FROM posts p
      INNER JOIN authors a
      ON p.author_id = a.id
      WHERE p.id = $1
      `,
      [id],
    );
    if (rows.length === 0) {
      logger.error("Couldn't find a post with this id");
      throw new AppError('Blog post not found', HttpStatus.NOT_FOUND);
    }
    res.status(HttpStatus.OK).json({
      rows: rows[0],
    });
  },
);

export const createPost = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { author_id, content, title } = createPostSchema.parse(req.body);

    const { rows: createdPost } = await pool.query(
      `
        INSERT INTO posts (
        title, content, author_id
        ) VALUES (
            $1, $2, $3 
        )
            RETURNING *
        `,
      [title, content, author_id],
    );
    res
      .status(HttpStatus.CREATED)
      .json({ message: 'Post created successfully', post: createdPost[0] });
  },
);

export const updatePost = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = getPostParamsSchema.parse(req.params);
    const updates = updatePostSchema.parse(req.body);

    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (Object.keys(updates).length === 0) {
      throw new AppError('No fields to update', HttpStatus.BAD_REQUEST);
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');

    const { rows: updatedPost } = await pool.query(
      `
      UPDATE posts 
      SET ${setClause}, updated_at = NOW() 
      WHERE id = $${values.length + 1}
      RETURNING *
      `,
      [...values, id],
    );

    // 6. Check if the post existed
    if (updatedPost.length === 0) {
      throw new AppError('Post not found', HttpStatus.NOT_FOUND);
    }

    res
      .status(HttpStatus.ACCEPTED)
      .json({ message: 'Post updated successfully', post: updatedPost[0] });
  },
);

export const deletePost = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = getPostParamsSchema.parse(req.params);

    const { rows: deletedPost } = await pool.query(
      ` 
        DELETE FROM posts 
        WHERE id = $1
        RETURNING *
        `,
      [id],
    );
    if (deletedPost.length === 0) {
      throw new AppError('Blog post not found', HttpStatus.NOT_FOUND);
    }
    res
      .status(HttpStatus.ACCEPTED)
      .json({ message: 'Post has been deleted', post: deletedPost[0] });
  },
);
