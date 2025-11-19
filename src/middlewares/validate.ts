import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

// Type to specify what parts of the request to validate
type ValidationTarget = 'body' | 'query' | 'params';

// Middleware function that takes a Zod schema and what to validate
export const validate = (
  schema: z.ZodObject<any, any>,
  target: ValidationTarget = 'body',
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the specified part of the request
      const dataToValidate = req[target];
      schema.parse(dataToValidate);
      next(); // If validation passes, continue
    } catch (error) {
      if (error instanceof ZodError) {
        // Format the errors nicely
        const errors = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        res.status(400).json({
          message: 'Validation failed',
          errors,
        });
      } else {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    }
  };
};
