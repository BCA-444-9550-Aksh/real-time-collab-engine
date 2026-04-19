import { Schema, model, Document } from 'mongoose';
import { ICollaborator, CollaboratorRole } from '../types';

/**
 * Collaborator Model — Separate collection (not embedded in Document).
 *
 * Design decisions:
 * - Separated from Document to prevent the document from growing unboundedly
 *   as collaborators are added/removed. Avoids MongoDB's 16 MB document limit.
 *
 * - Compound unique index (docId + userId) enforces that a user can only have
 *   one role per document. Use `findOneAndUpdate` with upsert to change roles.
 *
 * - Role here is document-level (not system-level). A system `viewer` can be
 *   an `admin` of a specific document if the owner promotes them.
 *
 * - Soft-delete is NOT used here; removing a collaborator = hard delete.
 *   Operation history retains their userId for audit trail.
 *
 * Scalability:
 * - docId index supports: "list all collaborators of a document"
 * - userId index supports: "list all documents a user collaborates on"
 */

export type CollaboratorDocument = ICollaborator & Document;

const CollaboratorSchema = new Schema<CollaboratorDocument>(
  {
    docId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'editor', 'viewer'] satisfies CollaboratorRole[],
      default: 'viewer',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // only createdAt needed
    versionKey: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Primary: compound unique — one role per user per document
CollaboratorSchema.index({ docId: 1, userId: 1 }, { unique: true });

// Support reverse lookup: "which documents can this user access?"
CollaboratorSchema.index({ userId: 1, docId: 1 });

// Role-filtered query: "list all editors of a document"
CollaboratorSchema.index({ docId: 1, role: 1 });

export const Collaborator = model<CollaboratorDocument>('Collaborator', CollaboratorSchema);
