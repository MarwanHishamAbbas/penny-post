import { asyncHandler } from '@/middlewares/async-handler';

import { Request, Response } from 'express';
import { HttpStatus } from '@/lib/status-codes';

import logger from '@/lib/winston';
import { logoutSchema } from '@/schemas/user';
import { SessionService } from '@/services/session';
import { TokenService } from '@/services/token';
import { pool } from '@/lib/database';

export const logoutUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { logout_all } = logoutSchema.parse(req.body);
    const sessionToken = req.cookies?.session_token;

    if (!req.user) {
      // Already logged out or no session
      SessionService.clearAuthCookies(res);
      res.status(HttpStatus.OK).json({
        message: 'Logged out successfully',
      });
      return;
    }

    const userId = req.user.id;

    try {
      if (logout_all) {
        // Logout from all devices
        await TokenService.revokeAllUserTokens(userId);
        logger.info(`User ${userId} logged out from all devices`);
      } else if (sessionToken) {
        // Logout only current session
        const sessionTokenHash = await TokenService.hashToken(sessionToken);

        await pool.query(
          'DELETE FROM sessions WHERE token = $1 AND user_id = $2',
          [sessionTokenHash, userId],
        );

        logger.info(`User ${userId} logged out from current session`);
      }

      // Clear cookies
      SessionService.clearAuthCookies(res);

      res.status(HttpStatus.OK).json({
        message: logout_all
          ? 'Logged out from all devices'
          : 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout error:', error);

      // Still try to clear cookies even if DB operation fails
      SessionService.clearAuthCookies(res);

      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Logout failed',
      });
    }
  },
);
