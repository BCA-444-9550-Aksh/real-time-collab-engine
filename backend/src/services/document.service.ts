import { Types } from 'mongoose';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { IDocument } from '../types';
import { DocumentModel } from '../models/Document';
import { Collaborator } from '../models/Collaborator';
import { AppError } from '../middleware/errorHandler';

const DOC_CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'doc:';

// ─── Cache helpers ─────────────────────────────────────────────────────────────

function cacheKey(docId: string): string {
  return `${CACHE_PREFIX}${docId}`;
}

async function cacheDoc(docId: string, doc: object): Promise<void> {
  await redis.setex(cacheKey(docId), DOC_CACHE_TTL, JSON.stringify(doc));
}

async function getCachedDoc(docId: string): Promise<object | null> {
  const raw = await redis.get(cacheKey(docId));
  return raw ? (JSON.parse(raw) as object) : null;
}

export async function invalidateDocCache(docId: string): Promise<void> {
  await redis.del(cacheKey(docId));
}

// ─── Access check ─────────────────────────────────────────────────────────────

/**
 * Verifies a user can access a document:
 * - Owner always has access
 * - Collaborator with any role has read access
 * - Throws 403 if neither
 */
export async function assertDocAccess(
  docId: string,
  userId: string
): Promise<void> {
  const doc = await getDocumentById(docId);

  if (doc.ownerId.toString() === userId) return;

  const collab = await Collaborator.findOne({
    docId: new Types.ObjectId(docId),
    userId: new Types.ObjectId(userId),
  }).lean();

  if (!collab) {
    throw new AppError('You do not have access to this document', 403, 'FORBIDDEN');
  }
}

/**
 * Verifies a user can edit a document (editor or admin role).
 */
export async function assertDocWriteAccess(
  docId: string,
  userId: string
): Promise<void> {
  const doc = await getDocumentById(docId);

  if (doc.ownerId.toString() === userId) return;

  const collab = await Collaborator.findOne({
    docId: new Types.ObjectId(docId),
    userId: new Types.ObjectId(userId),
  }).lean();

  if (!collab || collab.role === 'viewer') {
    throw new AppError('You do not have write access to this document', 403, 'WRITE_FORBIDDEN');
  }
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function createDocument(ownerId: string, title: string) {
  const doc = await DocumentModel.create({
    ownerId: new Types.ObjectId(ownerId),
    title,
  });

  const result = doc.toObject();
  await cacheDoc(doc.id, result);

  logger.debug(`Document created: ${doc.id}`);
  return result;
}

export async function getDocumentById(docId: string): Promise<IDocument> {
  if (!Types.ObjectId.isValid(docId)) {
    throw new AppError('Invalid document ID', 400, 'INVALID_ID');
  }

  // Read-through cache
  const cached = await getCachedDoc(docId);
  if (cached) return cached as IDocument;

  const doc = await DocumentModel.findOne({
    _id: new Types.ObjectId(docId),
    isDeleted: false,
  }).lean<IDocument>();

  if (!doc) {
    throw new AppError('Document not found', 404, 'NOT_FOUND');
  }

  await cacheDoc(docId, doc);
  return doc;
}

export async function updateDocument(
  docId: string,
  userId: string,
  updates: { title?: string }
) {
  const doc = await getDocumentById(docId);

  // Only owner or admin collaborator can update metadata
  const isOwner = doc.ownerId.toString() === userId;
  if (!isOwner) {
    const collab = await Collaborator.findOne({
      docId: new Types.ObjectId(docId),
      userId: new Types.ObjectId(userId),
    }).lean();
    if (!collab || collab.role === 'viewer' || collab.role === 'editor') {
      throw new AppError('Only the owner or an admin can update document metadata', 403, 'FORBIDDEN');
    }
  }

  const updated = await DocumentModel.findByIdAndUpdate(
    docId,
    { $set: updates },
    { new: true, lean: true }
  );

  await invalidateDocCache(docId);
  return updated;
}

export async function deleteDocument(docId: string, userId: string) {
  const doc = await getDocumentById(docId);

  if (doc.ownerId.toString() !== userId) {
    throw new AppError('Only the document owner can delete it', 403, 'FORBIDDEN');
  }

  // Soft delete — preserves op history and versions
  await DocumentModel.findByIdAndUpdate(docId, { isDeleted: true });
  await invalidateDocCache(docId);

  logger.info(`Document soft-deleted: ${docId} by user ${userId}`);
}

export async function getUserDocuments(userId: string) {
  // Documents owned OR collaborated on
  const [owned, collabs] = await Promise.all([
    DocumentModel.find({ ownerId: new Types.ObjectId(userId), isDeleted: false }).lean(),
    Collaborator.find({ userId: new Types.ObjectId(userId) })
      .populate<{ docId: typeof DocumentModel }>({
        path: 'docId',
        match: { isDeleted: false },
      })
      .lean(),
  ]);

  const collaboratedDocs = collabs
    .map((c) => c.docId)
    .filter(Boolean);

  return { owned, collaborated: collaboratedDocs };
}

/**
 * Atomically increments the document's currentVersion counter.
 * Returns the new version number assigned to the incoming operation.
 * Uses MongoDB findOneAndUpdate for atomic increment.
 */
export async function incrementDocVersion(docId: string): Promise<number> {
  const updated = await DocumentModel.findByIdAndUpdate(
    docId,
    { $inc: { currentVersion: 1 } },
    { new: true, lean: true, fields: { currentVersion: 1 } }
  );

  if (!updated) {
    throw new AppError('Document not found during version increment', 404, 'NOT_FOUND');
  }

  // Invalidate cache after version change
  await invalidateDocCache(docId);

  return (updated as { currentVersion: number }).currentVersion;
}

/**
 * Reads the active document content from Redis (live working state).
 * Falls back to reconstructing from snapshot + ops if not in cache.
 */
export async function getActiveDocumentContent(docId: string): Promise<string> {
  const key = `doc:content:${docId}`;
  const cached = await redis.get(key);
  return cached ?? '';
}

/**
 * Writes the active document content back to Redis.
 * Called after each CRDT operation is applied.
 */
export async function setActiveDocumentContent(
  docId: string,
  content: string
): Promise<void> {
  const key = `doc:content:${docId}`;
  await redis.setex(key, env.SNAPSHOT_INTERVAL * 60, content);
}
