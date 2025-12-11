import { asyncHandler } from '@/middlewares/async-handler';

import { Request, Response } from 'express';
import { HttpStatus } from '@/lib/status-codes';

import logger from '@/lib/winston';
import { SessionService } from '@/services/session';
import { TokenService } from '@/services/token';

export const refreshToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refresh_token || req.body.refresh_token;

    if (!refreshToken) {
      SessionService.clearAuthCookies(res);
      res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Refresh token required',
        code: 'NO_REFRESH_TOKEN',
      });
      return;
    }

    const ipAddress = SessionService.getClientIp(req);
    const userAgent = SessionService.getUserAgent(req);

    try {
      // Attempt to refresh session
      const tokenPair = await TokenService.refreshSession(
        refreshToken,
        ipAddress,
        userAgent,
      );

      // Set new cookies
      SessionService.setAuthCookies(
        res,
        tokenPair.sessionToken,
        tokenPair.refreshToken,
        tokenPair.refreshExpiresAt,
      );

      res.status(HttpStatus.OK).json({
        message: 'Session refreshed',
        data: {
          session: {
            expires_at: tokenPair.sessionExpiresAt,
          },
        },
      });
    } catch (error: any) {
      logger.warn('Token refresh failed:', error.message);

      // Clear cookies on refresh failure
      SessionService.clearAuthCookies(res);

      if (
        error.message.includes('Invalid') ||
        error.message.includes('expired')
      ) {
        res.status(HttpStatus.UNAUTHORIZED).json({
          message: 'Session expired. Please login again.',
          code: 'REFRESH_TOKEN_INVALID',
        });
        return;
      }

      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to refresh session',
      });
    }
  },
);
