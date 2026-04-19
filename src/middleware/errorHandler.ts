import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Custom application error.
 * All intentional errors throughout the app throw AppError.
 * This gives us a consistent shape for the global error handler.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // operational errors = known, handled errors

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Express error handler.
 * Must be registered LAST in the middleware chain (after all routes).
 *
 * Handles:
 * - AppError (operational errors, known shape)
 * - Mongoose validation errors
 * - Mongoose duplicate key errors (code 11000)
 * - JWT errors (from other middlewares)
 * - Unknown/unexpected errors
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // ── AppError (operational) ──────────────────────────────────────────────────
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Operational error', {
        message: err.message,
        code: err.code,
        stack: err.stack,
        path: req.path,
        method: req.method,
      });
    }

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.details !== undefined && { details: err.details }),
    });
    return;
  }

  // ── Mongoose validation error ───────────────────────────────────────────────
  if (isMongooseValidationError(err)) {
    const details = Object.values(err.errors).map((e: { path: string; message: string }) => ({
      field: e.path,
      message: e.message,
    }));
    res.status(422).json({
      success: false,
      message: 'Database validation failed',
      code: 'DB_VALIDATION_ERROR',
      details,
    });
    return;
  }

  // ── Mongoose duplicate key ──────────────────────────────────────────────────
  if (isMongooseDuplicateKeyError(err)) {
    res.status(409).json({
      success: false,
      message: 'A record with this value already exists',
      code: 'DUPLICATE_KEY',
    });
    return;
  }

  // ── Unexpected error ────────────────────────────────────────────────────────
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  const stack = err instanceof Error ? err.stack : undefined;

  logger.error('Unhandled error', {
    message,
    stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

// ─── Type guards ─────────────────────────────────────────────────────────────

function isMongooseValidationError(err: unknown): err is {
  name: string;
  errors: Record<string, { path: string; message: string }>;
} {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: string }).name === 'ValidationError' &&
    'errors' in err
  );
}

function isMongooseDuplicateKeyError(err: unknown): err is { code: number } {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}
