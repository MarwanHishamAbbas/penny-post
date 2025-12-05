import { pool } from '@/lib/database';
import { HttpStatus } from '@/lib/status-codes';
import { asyncHandler } from '@/middlewares/async-handler';
import { Request, Response } from 'express';

export const getAllTags = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { rows: tags } = await pool.query(`SELECT id, name FROM tags`);
    res.status(HttpStatus.OK).json({
      tags,
    });
  },
);
