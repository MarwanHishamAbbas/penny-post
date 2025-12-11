import z from 'zod';

export const registerUserSchema = z.object(
  {
    email: z.email('Invalid Email').min(1, 'Email is required'),
    name: z.string('Invalid Name').min(1, 'Name is required'),
    password: z
      .string('Password is required')
      .min(8, 'Password must be at least 8 characters long'),
  },
  { error: "User's body is required" },
);

export const validateEmailSchema = z.object({
  token: z.string('Verification Token is required'),
});

export const loginSchema = z.object(
  {
    email: z.email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  },
  { error: "User's body is required" },
);

export const refreshSchema = z.object({
  refresh_token: z.string().optional(),
});

export const logoutSchema = z.object({
  logout_all: z.boolean().optional().default(false),
});

export const revokeSessionSchema = z.object({
  session_id: z.string().uuid('Invalid session ID'),
});
