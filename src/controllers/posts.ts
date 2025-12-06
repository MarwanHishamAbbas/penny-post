import { pool } from '@/lib/database';
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
    const { search, status, tag, cursor } = postQuerySchema.parse(req.query);

    const limit = 9;
    const cursorData = cursor ? decodeCursor(cursor) : null;

    if (cursor && !cursorData) {
      throw new AppError('Invalid cursor', HttpStatus.BAD_REQUEST);
    }

    let whereConditions: string[] = [`p.status LIKE $1`];
    let params: any[] = [`%${status}%`];

    if (cursorData) {
      params.push(cursorData.created_at, cursorData.id);
      whereConditions.push(
        `(p.created_at, p.id) < ($${params.length - 1}, $${params.length})`,
      );
    }

    if (search) {
      params.push(`%${search}%`);
      whereConditions.push(`p.title ILIKE $${params.length}`);
    }

    if (tag) {
      params.push(tag);
      whereConditions.push(`EXISTS (
        SELECT 1 FROM posts_tags pt
        JOIN tags t ON pt.tag_id = t.id
        WHERE pt.post_id = p.id AND t.name = $${params.length}
      )`);
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
    a.name as author_name,
    (
      SELECT COALESCE(array_agg(t.name), '{}')
      FROM posts_tags pt
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE pt.post_id = p.id
    ) as tags
   FROM posts p
   INNER JOIN authors a ON p.author_id = a.id
   LEFT JOIN categories c ON p.category_id = c.id
   WHERE ${whereClause}
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
