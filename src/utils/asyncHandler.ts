import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express route handler so that unhandled promise rejections
 * are forwarded to the global error handler (next(err)).
 *
 * Without this, an async handler that throws will cause an unhandled rejection
 * and the server won't send a response.
 *
 * Usage:
 *   router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
