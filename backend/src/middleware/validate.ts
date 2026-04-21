import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler';

type ValidateTarget = 'body' | 'params' | 'query';

/**
 * Generic Zod schema validation middleware.
 *
 * Usage examples:
 *   validate('body', registerSchema)
 *   validate('params', docIdParamSchema)
 *   validate('query', paginationSchema)
 *
 * On validation failure, returns 422 with a structured array of field errors.
 * On success, replaces req[target] with the Zod-parsed (and transformed) value.
 */
export function validate<T>(target: ValidateTarget, schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = (result.error as ZodError).errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));

      return next(
        new AppError(
          'Validation failed',
          422,
          'VALIDATION_ERROR',
          errors
        )
      );
    }

    // Replace with the parsed (and potentially transformed) value
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}
