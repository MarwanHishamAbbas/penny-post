import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcrypt';
import { pool } from '@/lib/database';
import logger from '@/lib/winston';

export interface TokenPair {
  sessionToken: string;
  refreshToken: string;
  sessionExpiresAt: Date;
  refreshExpiresAt: Date;
}

export class TokenService {
  private static readonly SESSION_DURATION_MINUTES = 15; // 15 minutes
  private static readonly REFRESH_DURATION_DAYS = 30; // 30 days

  /**
   * Generate cryptographically secure random token
   */
  static generateToken(length: number = 64): string {
    return randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  /**
   * Hash token for storage (like password hashing)
   */
  static async hashToken(token: string): Promise<string> {
    // Use SHA-256 first, then bcrypt for added security
    const sha256Hash = createHash('sha256').update(token).digest('hex');
    return bcrypt.hash(sha256Hash, 10);
  }

  /**
   * Verify token against hashed version
   */
  static async verifyToken(
    token: string,
    hashedToken: string,
  ): Promise<boolean> {
    const sha256Hash = createHash('sha256').update(token).digest('hex');

    return bcrypt.compare(sha256Hash, hashedToken);
  }

  /**
   * Generate expiration dates
   */
  static generateExpirationDates(): {
    sessionExpiresAt: Date;
    refreshExpiresAt: Date;
  } {
    const now = new Date();

    const sessionExpiresAt = new Date(now);
    sessionExpiresAt.setMinutes(
      now.getMinutes() + this.SESSION_DURATION_MINUTES,
    );

    const refreshExpiresAt = new Date(now);
    refreshExpiresAt.setDate(now.getDate() + this.REFRESH_DURATION_DAYS);

    return { sessionExpiresAt, refreshExpiresAt };
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(expiresAt: Date): boolean {
    return new Date() >= new Date(expiresAt);
  }

  /**
   * Create session and refresh token pair
   */
  static async createTokenPair(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<TokenPair> {
    const { sessionExpiresAt, refreshExpiresAt } =
      this.generateExpirationDates();

    // Generate tokens
    const sessionToken = this.generateToken(64);
    const refreshToken = this.generateToken(64);

    // Hash tokens for storage

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create session
      await client.query(
        `
        INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [userId, sessionToken, sessionExpiresAt, ipAddress, userAgent],
      );

      // Create refresh token
      await client.query(
        `
        INSERT INTO refresh_tokens (user_id, token, expires_at, last_used_at)
        VALUES ($1, $2, $3, NOW())
        `,
        [userId, refreshToken, refreshExpiresAt],
      );

      await client.query('COMMIT');

      return {
        sessionToken,
        refreshToken,
        sessionExpiresAt,
        refreshExpiresAt,
      };
    } catch (error) {
      await client.query('ROLLBACK').catch((rollbackError) => {
        logger.error('Rollback failed in createTokenPair:', rollbackError);
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate refresh token and create new session
   */
  static async refreshSession(
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<TokenPair> {
    const client = await pool.connect();

    try {
      // Find refresh token
      const tokenResult = await client.query(
        `
        SELECT rt.*, u.id as user_id, u.email_verified
        FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token = $1 
          AND rt.expires_at > NOW()
          AND u.email_verified = true
        FOR UPDATE
        `,
        [refreshToken],
      );

      if (tokenResult.rows.length === 0) {
        throw new Error('Invalid or expired refresh token');
      }

      const tokenRecord = tokenResult.rows[0];

      // Delete the used refresh token (one-time use)
      await client.query('DELETE FROM refresh_tokens WHERE id = $1', [
        tokenRecord.id,
      ]);

      // Delete old sessions for this user (optional: keep last 5)
      await client.query(
        `
        DELETE FROM sessions 
        WHERE user_id = $1 
          AND expires_at < NOW() - INTERVAL '7 days'
        `,
        [tokenRecord.user_id],
      );

      // Create new token pair
      const newTokenPair = await this.createTokenPair(
        tokenRecord.user_id,
        ipAddress,
        userAgent,
      );

      return newTokenPair;
    } catch (error) {
      await client.query('ROLLBACK').catch((rollbackError) => {
        logger.error('Rollback failed in refreshSession:', rollbackError);
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Revoke all tokens for a user (logout from all devices)
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

      await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [
        userId,
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch((rollbackError) => {
        logger.error('Rollback failed in revokeAllUserTokens:', rollbackError);
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get active sessions for a user
   */
  static async getUserSessions(userId: string): Promise<
    Array<{
      id: string;
      ip_address: string;
      user_agent: string;
      created_at: Date;
      expires_at: Date;
    }>
  > {
    const result = await pool.query(
      `
      SELECT id, ip_address, user_agent, created_at, expires_at
      FROM sessions
      WHERE user_id = $1 AND expires_at > NOW()
      ORDER BY created_at DESC
      `,
      [userId],
    );

    return result.rows;
  }

  /**
   * Revoke specific session
   */
  static async revokeSession(
    sessionId: string,
    userId: string,
  ): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId],
    );

    return (result.rowCount as number) > 0;
  }
}
