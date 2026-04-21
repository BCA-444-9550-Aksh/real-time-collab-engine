import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtAccessPayload } from '../types';
import { AppError } from './errorHandler';

/**
 * Auth Middleware
 * Verifies the JWT access token from the Authorization header.
 * Attaches the decoded payload to req.user for downstream handlers.
 *
 * Header format: Authorization: Bearer <token>
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication token is required', 401, 'MISSING_TOKEN'));
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Access token has expired', 401, 'TOKEN_EXPIRED'));
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid access token', 401, 'INVALID_TOKEN'));
    }
    next(err);
  }
}

/**
 * Optional auth — attaches user if token present, does not fail if absent.
 * Useful for public routes that have optional personalization.
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    // Token present but invalid — ignore silently for optional auth
  }

  next();
}
