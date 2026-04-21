import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { success, error } from '../utils/apiResponse';

/**
 * Rate limiter for authentication routes.
 * Stricter limit to prevent brute-force attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_AUTH,
  standardHeaders: true,    // Return RateLimit-* headers
  legacyHeaders: false,
  message: error('Too many requests. Please try again later.', 'RATE_LIMITED'),
  skipSuccessfulRequests: false,
});

/**
 * General rate limiter for all other API routes.
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_API,
  standardHeaders: true,
  legacyHeaders: false,
  message: error('Too many requests. Please try again later.', 'RATE_LIMITED'),
  skipSuccessfulRequests: false,
});
