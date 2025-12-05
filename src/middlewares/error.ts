import { Request, Response, NextFunction } from 'express';
import { env } from '@/config/env';
import logger from '@/lib/winston';
import { HttpStatus } from '@/lib/status-codes';
import { extractFieldFromDetail } from '@/lib/utils';

export class AppError extends Error {
  statusCode: number;
  code: string;
  field?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'ERROR',
    field?: string,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Wrapper function that catches async errors
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handler middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Always log the full error for debugging
  logger.error('Error:', err);

  // Default error response
  let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
  let message = 'Something went wrong, please try again later';
  let code = 'INTERNAL_ERROR';
  let field: string | undefined;

  // Handle our custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    field = err.field;
  }

  // Handle PostgreSQL errors
  else if (err.code === '23505') {
    statusCode = HttpStatus.CONFLICT;
    code = 'DUPLICATE_ENTRY';
    field = extractFieldFromDetail(err.detail);
    message = field
      ? `This ${field} already exists`
      : 'This record already exists';
  } else if (err.code === '23503') {
    statusCode = HttpStatus.BAD_REQUEST;
    code = 'INVALID_REFERENCE';
    field = extractFieldFromDetail(err.detail);
    message = field
      ? `The selected ${field.replace('_id', '')} does not exist`
      : 'Referenced record does not exist';
  } else if (err.code === '23502') {
    statusCode = HttpStatus.BAD_REQUEST;
    code = 'MISSING_FIELD';
    field = err.column;
    message = field ? `${field} is required` : 'A required field is missing';
  }

  // Build the response
  const response: Record<string, any> = {
    message,
    code,
  };

  // Only include field if it exists
  if (field) {
    response.field = field;
  }

  // Only include stack trace in development
  if (env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
