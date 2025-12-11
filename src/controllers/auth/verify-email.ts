import { pool } from '@/lib/database';
import { HttpStatus } from '@/lib/status-codes';
import { verifyToken } from '@/lib/token';
import logger from '@/lib/winston';
import { asyncHandler } from '@/middlewares/async-handler';
import { validateEmailSchema } from '@/schemas/user';
import { Request, Response } from 'express';

export const verifyEmail = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { token } = validateEmailSchema
      .pick({ token: true })
      .parse(req.query);

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Find a token not expired & not used
      const { rows: tokenResults } = await client.query(
        `
        SELECT vt.id, vt.token_hash, vt.user_id, u.email
        FROM verification_tokens vt 
        INNER JOIN users u ON vt.user_id = u.id
        WHERE vt.expires_at > NOW()
            AND vt.used = false
            AND u.email_verified = false
        `,
      );

      let validToken = null;
      for (const tokenRecord of tokenResults) {
        const isValidToken = await verifyToken(token, tokenRecord.token_hash);
        if (isValidToken) {
          validToken = tokenRecord;
          break;
        }
      }

      if (!validToken) {
        res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Invalid, expired, or already used verification token',
        });
        return;
      }
      // Mark token as used

      await client.query(
        `UPDATE verification_tokens SET used = true WHERE id = $1`,
        [validToken.id],
      );

      // Update user's email verification status
      await client.query(
        `UPDATE users SET email_verified = true WHERE id = $1`,
        [validToken.user_id],
      );

      // Delete other verification tokens for this user (cleanup)
      await client.query(
        'DELETE FROM verification_tokens WHERE user_id = $1 AND id != $2',
        [validToken.user_id, validToken.id],
      );

      await client.query('COMMIT');

      res.status(HttpStatus.OK).json({
        message: 'Email verified successfully!',
        data: {
          userId: validToken.user_id,
          email: validToken.email,
          name: validToken.name,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK').catch((rollbackError) => {
        logger.error('Rollback failed:', rollbackError);
      });

      logger.error('Error verifying email:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to verify email',
      });
    } finally {
      client.release();
    }
  },
);
