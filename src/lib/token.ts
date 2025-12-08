import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';

/**
 * Generate a secure random token
 */
export const generateToken = (length: number = 25): string => {
  return randomBytes(length).toString('hex');
};

/**
 * Hash a token for storage (like password hashing)
 */
export const hashToken = (token: string): Promise<string> => {
  return bcrypt.hash(token, 10);
};

/**
 * Verify if a token matches the hashed version
 */
export const verifyToken = (
  token: string,
  hashedToken: string,
): Promise<boolean> => {
  return bcrypt.compare(token, hashedToken);
};

/**
 * Generate expiration date (default 24 hours from now)
 */
export const getExpirationDate = (hours: number = 24): Date => {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (expiresAt: Date): boolean => {
  return new Date() > new Date(expiresAt);
};
