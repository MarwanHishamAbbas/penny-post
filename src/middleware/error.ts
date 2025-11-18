import { env } from '@/config/env';
import logger from '@/lib/winston';
import type { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  status?: number;
  code?: string;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // logger.error(err.stack);

  // Default error
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    ...(env.APP_STAGE === 'development' && {
      stack: err.stack,
      details: err.message,
    }),
  });
};

export const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
