import { z } from 'zod';
import { objectIdSchema } from './document.validator';

// ─── Add Collaborator ─────────────────────────────────────────────────────────

export const addCollaboratorSchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.enum(['admin', 'editor', 'viewer'], {
    errorMap: () => ({ message: 'Role must be admin, editor, or viewer' }),
  }),
});

// ─── Update Collaborator Role ─────────────────────────────────────────────────

export const updateCollaboratorRoleSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer'], {
    errorMap: () => ({ message: 'Role must be admin, editor, or viewer' }),
  }),
});

// ─── Collaborator User ID Param ───────────────────────────────────────────────

export const collaboratorParamSchema = z.object({
  id: objectIdSchema,
  userId: objectIdSchema,
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type AddCollaboratorInput = z.infer<typeof addCollaboratorSchema>;
export type UpdateCollaboratorRoleInput = z.infer<typeof updateCollaboratorRoleSchema>;
