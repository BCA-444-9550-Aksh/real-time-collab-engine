import { ApiResponse } from '../types';

/**
 * Standardized API response helpers.
 * All controllers use these to guarantee a consistent response shape.
 */

export function success<T>(data: T, message?: string, meta?: Record<string, unknown>): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };
}

export function error(message: string, code = 'ERROR', details?: unknown): ApiResponse {
  return {
    success: false,
    message,
    code,
    ...(details !== undefined && { details }),
  };
}
