import { pool } from '@/lib/database';

import logger from '@/lib/winston';
import { TokenService } from './token';
import { Request, Response } from 'express';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  email_verified: boolean;
}

export class SessionService {
  /**
   * Validate session token and return user
   */
  static async validateSession(
    sessionToken: string,
  ): Promise<SessionUser | null> {
    if (!sessionToken) return null;

    try {
      const result = await pool.query(
        `
        SELECT u.id, u.email, u.name, u.avatar_url, u.email_verified
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = $1 
          AND s.expires_at > NOW()
          AND u.email_verified = true
        `,
        [sessionToken],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error validating session:', error);
      return null;
    }
  }

  /**
   * Get IP address from request
   */
  static getClientIp(req: Request): string {
    const xForwardedFor = req.headers['x-forwarded-for'];
    const forwardedIp = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor?.split(',')[0];

    return req.ip || req.socket?.remoteAddress || forwardedIp || 'unknown';
  }

  /**
   * Get user agent from request
   */
  static getUserAgent(req: Request): string {
    return req.headers['user-agent'] || 'unknown';
  }

  /**
   * Set authentication cookies
   */
  static setAuthCookies(
    res: Response,
    sessionToken: string,
    refreshToken: string,
    refreshExpiresAt: Date,
  ): void {
    const isProduction = process.env.NODE_ENV === 'production';

    // Session token cookie (15 minutes)
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
      ...(isProduction && { domain: process.env.COOKIE_DOMAIN }),
    });

    // Refresh token cookie (30 days, only accessible to refresh endpoint)
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      expires: refreshExpiresAt,
      ...(isProduction && { domain: process.env.COOKIE_DOMAIN }),
    });
  }

  /**
   * Clear authentication cookies
   */
  static clearAuthCookies(res: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';

    res.clearCookie('session_token', {
      path: '/',
      ...(isProduction && { domain: process.env.COOKIE_DOMAIN }),
    });

    res.clearCookie('refresh_token', {
      path: '/',
      ...(isProduction && { domain: process.env.COOKIE_DOMAIN }),
    });
  }

  /**
   * Check if user has too many active sessions
   */
  static async checkSessionLimit(
    userId: string,
    maxSessions: number = 5,
  ): Promise<boolean> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND expires_at > NOW()',
      [userId],
    );

    return parseInt(result.rows[0].count) >= maxSessions;
  }

  /**
   * Clean up expired sessions (to be called by scheduled job)
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const result = await pool.query(
      `
      DELETE FROM sessions 
      WHERE expires_at < NOW() - INTERVAL '7 days'
      RETURNING id
      `,
    );

    logger.info(`Cleaned up ${result.rowCount} expired sessions`);
    return result.rowCount || 0;
  }

  /**
   * Clean up expired refresh tokens (to be called by scheduled job)
   */
  static async cleanupExpiredRefreshTokens(): Promise<number> {
    const result = await pool.query(
      `
      DELETE FROM refresh_tokens 
      WHERE expires_at < NOW() - INTERVAL '1 day'
      RETURNING id
      `,
    );

    logger.info(`Cleaned up ${result.rowCount} expired refresh tokens`);
    return result.rowCount || 0;
  }
}
