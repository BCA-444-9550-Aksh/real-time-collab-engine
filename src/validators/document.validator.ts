import { z } from 'zod';

// ─── Common ───────────────────────────────────────────────────────────────────

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');

export const docIdParamSchema = z.object({
  id: objectIdSchema,
});

export const paginationSchema = z.object({
  limit: z.string().optional().transform((v) => (v ? Math.min(Number(v), 100) : 20)),
  cursor: z.string().optional(), // ISO date string for cursor-based pagination
});

// ─── Create Document ──────────────────────────────────────────────────────────

export const createDocSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(500, 'Title must be ≤ 500 characters')
    .default('Untitled Document'),
});

// ─── Update Document (metadata only) ─────────────────────────────────────────

export const updateDocSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// ─── Rollback to Version ──────────────────────────────────────────────────────

export const rollbackSchema = z.object({
  versionNumber: z
    .number({ required_error: 'versionNumber is required' })
    .int('versionNumber must be an integer')
    .min(0, 'versionNumber must be ≥ 0'),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateDocInput = z.infer<typeof createDocSchema>;
export type UpdateDocInput = z.infer<typeof updateDocSchema>;
export type RollbackInput = z.infer<typeof rollbackSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
