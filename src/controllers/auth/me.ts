import { asyncHandler } from '@/middlewares/async-handler';
import { Request, Response } from 'express';
import { HttpStatus } from '@/lib/status-codes';
import { pool } from '@/lib/database';
import { SessionService } from '@/services/session';

interface CurrentUserRequest extends Request {
  user: any;
}

export const getCurrentUser = asyncHandler(
  async (req: CurrentUserRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Not authenticated',
      });
      return;
    }

    try {
      // Get fresh user data from database
      const result = await pool.query(
        `
        SELECT 
          id, 
          email, 
          name, 
          avatar_url, 
          email_verified,
          created_at,
          updated_at
        FROM users 
        WHERE id = $1
        `,
        [req.user.id],
      );

      if (result.rows.length === 0) {
        // User no longer exists (shouldn't happen with foreign keys)
        SessionService.clearAuthCookies(res);
        res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'User not found',
        });
        return;
      }

      const user = result.rows[0];

      // Get active sessions if requested
      const includeSessions = req.query.include_sessions === 'true';

      let sessions: any = [];
      if (includeSessions) {
        const { TokenService } = await import('@/services/token');
        sessions = await TokenService.getUserSessions(user.id);
      }

      res.status(HttpStatus.OK).json({
        data: {
          user,
          ...(includeSessions && { sessions }),
        },
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to fetch user data',
      });
    }
  },
);
