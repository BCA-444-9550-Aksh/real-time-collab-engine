import { Schema, model, Document, Types } from 'mongoose';
import { IDocument } from '../types';

/**
 * Document Model — Lightweight metadata only.
 *
 * Design decisions:
 * - NO `content` field. Content is reconstructed from:
 *     latest Version snapshot + Operations after that snapshot.
 *   This is the event-sourcing / CRDT-compatible pattern.
 *
 * - NO embedded `collaborators[]`. Moved to a separate Collaborator
 *   collection to avoid document size blowup and enable efficient
 *   per-user queries without scanning every document.
 *
 * - `currentVersion` tracks the latest applied operation version.
 *   It is incremented atomically on every accepted operation.
 *
 * - `isDeleted` supports soft-delete. Hard delete only by admin purge job.
 *
 * - Shard key candidate: `_id` (distributed by ObjectId prefix)
 */

export type DocumentDoc = IDocument & Document;

const DocumentSchema = new Schema<DocumentDoc>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [500, 'Title must be ≤ 500 characters'],
      default: 'Untitled Document',
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // The highest operation version number applied to this document.
    // Used to determine the "next" operation version and to verify
    // version continuity during concurrent edits.
    currentVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,   // needed for "list non-deleted docs" queries
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// List documents owned by a user, newest first
DocumentSchema.index({ ownerId: 1, createdAt: -1 });

// Full-text search on title
DocumentSchema.index({ title: 'text' });

// Soft-delete filter + owner combination
DocumentSchema.index({ ownerId: 1, isDeleted: 1 });

export const DocumentModel = model<DocumentDoc>('Document', DocumentSchema);
