import { pool } from '@/lib/database';
import fs from 'fs';
import path from 'path';
import { HttpStatus } from '@/lib/status-codes';
import { decodeCursor, encodeCursor } from '@/lib/utils';
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
    const { status, cursor } = postQuerySchema
      .omit({ search: true })
      .parse(req.query);

    const limit = 9;
    const cursorData = cursor ? decodeCursor(cursor) : null;

    if (cursor && !cursorData) {
      throw new AppError('Invalid cursor', HttpStatus.BAD_REQUEST);
    }

    let whereConditions: string[] = [`p.status = $1`];
    let params: any[] = [status];

    if (cursorData) {
      params.push(cursorData.created_at, cursorData.id);
      whereConditions.push(
        `(p.created_at, p.id) < ($${params.length - 1}, $${params.length})`,
      );
    }

    const whereClause = whereConditions.join(' AND ');

    const { rows } = await pool.query(
      `SELECT 
    p.id, 
    p.status, 
    p.created_at AT TIME ZONE 'UTC' as created_at,
    p.updated_at AT TIME ZONE 'UTC' as updated_at,
    p.title, 
    p.content, 
    c.name as category, 
   FROM posts p
   LEFT JOIN categories c ON p.category_id = c.id
   WHERE ${whereClause} AND p.title <> ''
   ORDER BY p.created_at DESC, p.id DESC
   LIMIT $${params.length + 1}`,
      [...params, limit + 1],
    );

    const hasMore = rows.length > limit;
    const posts = hasMore ? rows.slice(0, limit) : rows;

    const nextCursor =
      hasMore && posts.length > 0
        ? encodeCursor({
            created_at: new Date(
              posts[posts.length - 1].created_at,
            ).toISOString(),
            id: posts[posts.length - 1].id,
          })
        : null;

    res.status(HttpStatus.OK).json({
      posts,
      nextCursor,
      hasMore,
    });
  },
);

export const searchPosts = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { search } = postQuerySchema.pick({ search: true }).parse(req.query);
    if (!search) {
      res.status(HttpStatus.ACCEPTED).json({ posts: [] });
    }

    const { rows } = await pool.query(
      `SELECT 
        p.id,
        p.title
      FROM posts p
      WHERE p.title <> '' 
        AND p.status = 'published' 
        AND p.title ILIKE $1
      GROUP BY p.id
      LIMIT 10`,
      [`%${search}%`], // ✅ CORRECT - No quotes!
    );

    const searchResults = rows.map((row) => ({
      id: row.id,
      title: row.title,
      author_name: row.author_name,
    }));

    res.status(HttpStatus.ACCEPTED).json({ posts: searchResults });
  },
);

export const getPostById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = getPostParamsSchema.parse(req.params);
    const { rows } = await pool.query(
      `
      SELECT p.*
      FROM posts p
      LEFT JOIN posts_tags pt ON p.id = pt.post_id
      WHERE p.id = $1
      GROUP BY p.id
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
