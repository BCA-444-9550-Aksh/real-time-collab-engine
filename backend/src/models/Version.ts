import { Schema, model, Document } from 'mongoose';
import { IVersion } from '../types';

/**
 * Version Model — Point-in-time snapshots.
 *
 * Design decisions:
 * - A snapshot is taken every N operations (configurable via SNAPSHOT_INTERVAL env).
 *   This bounds the reconstruction cost: at most N ops need to be replayed.
 *
 * - `snapshot` stores the full serialized document state (e.g., a JSON string
 *   of the CRDT character array). For large documents, consider compression
 *   (zlib/gzip) before storing and decompress on read.
 *
 * - `versionNumber` corresponds to the `currentVersion` of the Document at
 *   the time the snapshot was taken. Querying "latest snapshot before version V"
 *   uses the compound index (docId, versionNumber DESC).
 *
 * - Snapshots are immutable after creation. Never update a snapshot.
 *
 * - Old snapshots can be pruned after a retention period (e.g., keep last 10).
 *   This is done by an async job, not inline with user requests.
 */

export type VersionDocument = IVersion & Document;

const VersionSchema = new Schema<VersionDocument>(
  {
    docId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    // Full serialized document content at this version.
    // For very large documents (> 1 MB), store as Buffer after gzip compression.
    snapshot: {
      type: String,
      required: true,
    },
    // The document's version number at snapshot time.
    // Matches Document.currentVersion at the moment of snapshot creation.
    versionNumber: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// PRIMARY: find the latest snapshot for a document efficiently
// Query: db.versions.find({docId}).sort({versionNumber: -1}).limit(1)
VersionSchema.index({ docId: 1, versionNumber: -1 });

// Support rollback: "give me snapshot for docId at versionNumber X"
// This is the same index as above — MongoDB will use it for both queries

export const Version = model<VersionDocument>('Version', VersionSchema);
