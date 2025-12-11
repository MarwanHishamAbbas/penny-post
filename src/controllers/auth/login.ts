import { pool } from '@/lib/database';
import { asyncHandler } from '@/middlewares/async-handler';
import { loginSchema } from '@/schemas/user';
import { SessionService } from '@/services/session';
import { Response, Request } from 'express';
import bcrypt from 'bcrypt';
import { HttpStatus } from '@/lib/status-codes';
import logger from '@/lib/winston';
import { TokenService } from '@/services/token';

export const loginUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = loginSchema.parse(req.body);
    const ipAddress = SessionService.getClientIp(req);
    const userAgent = SessionService.getUserAgent(req);

    // Find user with credentials account
    const userResult = await pool.query(
      `
      SELECT 
        u.id, 
        u.email, 
        u.name, 
        u.avatar_url, 
        u.email_verified,
        u.created_at,
        a.password_hash
        FROM users u 
        INNER JOIN accounts a 
        ON u.id = a.user_id
        WHERE email = $1 AND a.provider = 'credentials'
      `,
      [email],
    );
    if (userResult.rows.length === 0) {
      await bcrypt.compare(password, '$2b$12$fakehashforsecurity');
      res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Invalid email or password',
      });
      return;
    }

    const user = userResult.rows[0];

    if (!user.email_verified) {
      res.status(HttpStatus.FORBIDDEN).json({
        message: 'Please verify your email before logging in',
        code: 'EMAIL_NOT_VERIFIED',
        data: { email: user.email },
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      res.clearCookie('session_token', {
        path: '/',
      });

      res.clearCookie('refresh_token', {
        path: '/api/auth/refresh',
      });

      logger.warn(
        `Failed login attempt for email: ${email} from IP: ${ipAddress}`,
      );

      res.status(HttpStatus.UNAUTHORIZED).json({
        message: 'Invalid email or password',
      });
      return;
    }

    const tokenPair = await TokenService.createTokenPair(
      user.id,
      ipAddress,
      userAgent,
    );

    SessionService.setAuthCookies(
      res,
      tokenPair.sessionToken,
      tokenPair.refreshToken,
      tokenPair.refreshExpiresAt,
    );
    logger.info(`User ${user.id} logged in from IP: ${ipAddress}`);

    // Return user data (excluding sensitive info)
    res.status(HttpStatus.OK).json({
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
          email_verified: user.email_verified,
          created_at: user.created_at,
        },
        session: {
          expires_at: tokenPair.sessionExpiresAt,
        },
      },
    });
  },
);
