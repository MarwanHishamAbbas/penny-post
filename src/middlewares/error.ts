import { env } from '@/config/env';
import logger from '@/lib/winston';
import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  logger.error('Error:', err);

  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Handle specific error types
  if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Database errors
  if (err.code === '23505') {
    statusCode = 409;
    message = 'Duplicate entry';
  }

  if (err.code === '23503') {
    statusCode = 400;
    message = 'Referenced record not found';
  }

  res.status(statusCode).json({
    message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
