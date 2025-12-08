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
