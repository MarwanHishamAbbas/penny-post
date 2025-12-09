import { asyncHandler } from '@/middlewares/async-handler';
import { registerUserSchema } from '@/schemas/user';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '@/lib/database';
import logger from '@/lib/winston';
import { HttpStatus } from '@/lib/status-codes';
import { generateToken, getExpirationDate, hashToken } from '@/lib/token';
import { sendVerificationEmail } from '@/lib/email';

export const registerUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, name, password } = registerUserSchema.parse(req.body);

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if email already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email],
      );

      if (existingUser.rows.length > 0) {
        res.status(HttpStatus.CONFLICT).json({
          message: 'Email already exists',
        });
        return;
      }

      // Insert user
      const { rows } = await client.query(
        `
        INSERT INTO users (email, name, email_verified)
        VALUES ($1, $2, false)
        RETURNING id, name
        `,
        [email, name],
      );

      const registeredUser = rows[0];

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Insert account
      await client.query(
        `
        INSERT INTO accounts (user_id, provider, password_hash)
        VALUES ($1, $2, $3)
        `,
        [registeredUser.id, 'credentials', hashedPassword],
      );

      // Generate verification token (you need to implement this)
      const verificationToken = generateToken();
      const tokenHash = await hashToken(verificationToken);
      const expiresAt = getExpirationDate();

      // Store verification token
      await client.query(
        `
        INSERT INTO verification_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        `,
        [registeredUser.id, tokenHash, expiresAt],
      );
      await client.query('COMMIT');

      const verificationUrl = `http://localhost:3001/verify-email`;
      const emailSent = await sendVerificationEmail(
        email,
        name,
        verificationToken,
        verificationUrl,
      );
      if (!emailSent) {
        logger.warn(`Verification email failed to send for user: ${email}`);
      }

      res.status(HttpStatus.CREATED).json({
        message: `${registeredUser.name} created successfully. Please check your email to verify your account.`,
        data: {
          user_id: registeredUser.id,
          name: registeredUser.name,
          email,
          emailVerified: false,
          verificationEmailSent: emailSent,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK').catch((rollbackError) => {
        logger.error('Rollback failed:', rollbackError);
      });

      logger.error('Error registering user:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to register user',
      });
    } finally {
      client.release();
    }
  },
);
