import { z } from 'zod';

// ─── Register ─────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be ≤ 100 characters'),

  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address')
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be ≤ 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),

  role: z.enum(['admin', 'editor', 'viewer']).optional(),
});

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email().toLowerCase().trim(),
  password: z.string({ required_error: 'Password is required' }).min(1),
});

// ─── Refresh Token ────────────────────────────────────────────────────────────

export const refreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token is required' }).min(1),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
