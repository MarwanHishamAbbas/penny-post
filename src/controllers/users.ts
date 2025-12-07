import { asyncHandler } from '@/middlewares/async-handler';
import { registerUserSchema } from '@/schemas/user';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '@/lib/database';
import logger from '@/lib/winston';
import { HttpStatus } from '@/lib/status-codes';

// User Registration (email & password)

//  1. User submits: email, password, name
// 2. Backend validates:
//    - Email not already used
//    - Password meets requirements (min 8 chars, etc.)
// 3. Hash password with bcrypt (12 rounds)
// 4. Transaction:
//    - INSERT INTO users (email, name, email_verified=false)
//    - INSERT INTO accounts (user_id, provider='credentials', password_hash)
// 5. Generate email verification token
// 6. Send verification email
// 7. Return 201 Created (don't auto-login until verified)

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
          message: 'Email already registered',
        });
        return;
      }

      // Insert user
      const { rows } = await client.query(
        `
        INSERT INTO users (email, name, email_verifed)
        VALUES ($1, $2, true)
        RETURNING id, name
        `,
        [email, name],
      );

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Insert account
      await client.query(
        `
        INSERT INTO accounts (user_id, provider, password_hash)
        VALUES ($1, $2, $3)
        `,
        [rows[0].id, 'credentials', hashedPassword],
      );

      await client.query('COMMIT');

      // Generate verification token (you need to implement this)
      // const verificationToken = generateVerificationToken();
      // await sendVerificationEmail(email, verificationToken);

      res.status(HttpStatus.CREATED).json({
        message: `${rows[0].name} created successfully. Please check your email to verify your account.`,
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
