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
  // TODO, add Cursor based pagination
  async (req: Request, res: Response): Promise<void> => {
    let { search, status, tag } = postQuerySchema.parse(req.query);

    let whereConditions: string[] = [`status LIKE $1`];
    let params: any[] = [`%${status}%`];

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`title ILIKE $${params.length}`);
    }

    if (tag) {
      params.push(tag);
      whereConditions.push(`t.name = $${params.length}`);
    }

    const whereClause = whereConditions.join(' AND ');

    const { rows } = await pool.query(
      `SELECT p.id, p.status, p.created_at, p.title, p.content, c.name as category, a.name as author_name, array_agg(t.name) as tags, COUNT(*) OVER()::INTEGER as total_count
       FROM posts p
       INNER JOIN authors a ON p.author_id = a.id
       LEFT JOIN posts_tags pt ON p.id = pt.post_id
       LEFT JOIN tags t ON pt.tag_id = t.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE ${whereClause}
       GROUP BY p.id, a.name, c.name
       LIMIT 5
       `,
      params,
    );

    res.status(HttpStatus.OK).json({
      total: rows.length > 0 ? rows[0].total_count : 0,
      rows: rows.map(({ total_count, ...post }) => post),
      limit: 5,
    });
  },
);
export const getPostById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = getPostParamsSchema.parse(req.params);
    const { rows } = await pool.query(
      `
      SELECT p.*, a.name as author_name, array_agg(t.name) as tags
      FROM posts p
      INNER JOIN authors a
      ON p.author_id = a.id
      LEFT JOIN posts_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.id = $1
      GROUP BY p.id, a.name
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
    const { author_id, content, title, tags } = createPostSchema.parse(
      req.body,
    );

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
    const postId = createdPost[0].id;
    if (tags && tags.length > 0) {
      const placeholders = tags
        .map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`)
        .join(', ');

      const values = tags.flatMap((tagId: number) => [postId, tagId]);

      await pool.query(
        `INSERT INTO posts_tags (post_id, tag_id) VALUES ${placeholders}`,
        values,
      );
    }

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
