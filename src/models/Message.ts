import { Schema, model, Document } from 'mongoose';
import { IMessage } from '../types';

/**
 * Message Model — Document-scoped chat.
 *
 * Design decisions:
 * - Append-only: messages are never edited or deleted (audit/compliance).
 *   Add a `deletedAt` / `isDeleted` field if soft-delete is needed later.
 *
 * - Compound index (docId, createdAt) enables cursor-based pagination:
 *   "give me 50 messages for docId created before cursor timestamp"
 *   This is efficient and avoids SKIP-based pagination at scale.
 *
 * - No full-text search index by default. If needed, add a text index
 *   on `text` or offload to Elasticsearch.
 *
 * - For very active documents, consider a TTL to archive old messages.
 */

export type MessageDocument = IMessage & Document;

const MessageSchema = new Schema<MessageDocument>(
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
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      maxlength: [2000, 'Message must be ≤ 2000 characters'],
    },
    // Explicit field (not relying on Mongoose's `createdAt`) so we can
    // use it as a cursor in pagination queries with a dedicated index.
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    versionKey: false,
    // We manage `createdAt` explicitly; disable Mongoose auto-timestamps
    timestamps: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// PRIMARY: cursor-based pagination for chat history
// "Give me messages in doc X created before timestamp T, newest first"
MessageSchema.index({ docId: 1, createdAt: -1 });

// Support: "show all messages by a user" (moderation use case)
MessageSchema.index({ userId: 1, createdAt: -1 });

export const Message = model<MessageDocument>('Message', MessageSchema);
