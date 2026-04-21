import { Types } from 'mongoose';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { Operation } from '../models/Operation';
import { Version } from '../models/Version';
import { DocumentModel } from '../models/Document';
import { incrementDocVersion } from './document.service';
import { applyOp, deserializeDocument, serializeDocument, createCRDTDocument } from './crdt.service';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import { CRDTOp } from '../types';

// ─── Deduplication ────────────────────────────────────────────────────────────

const DEDUP_TTL = 60 * 60; // 1 hour in seconds
const DEDUP_PREFIX = 'op:dedup:';

async function isDuplicate(docId: string, clientId: string): Promise<boolean> {
  const key = `${DEDUP_PREFIX}${docId}:${clientId}`;
  const result = await redis.set(key, '1', 'EX', DEDUP_TTL, 'NX');
  return result === null; // null means key already existed → duplicate
}

// ─── Redis content key ────────────────────────────────────────────────────────

function contentKey(docId: string): string {
  return `doc:content:${docId}`;
}

// ─── Submit operation ─────────────────────────────────────────────────────────

export interface SubmitOpResult {
  version: number;
  content: string;
  isSnapshot: boolean;
}

/**
 * Submits a CRDT operation to the system.
 *
 * Flow:
 * 1. Deduplicate via clientId
 * 2. Atomically assign next version number
 * 3. Fetch current CRDT state from Redis
 * 4. Apply CRDT op → get new state
 * 5. Persist op to MongoDB
 * 6. Write new state to Redis
 * 7. Snapshot check: if version % SNAPSHOT_INTERVAL === 0, take snapshot
 *
 * @returns The server-assigned version and new document content
 */
export async function submitOperation(
  docId: string,
  userId: string,
  op: CRDTOp,
  clientId?: string
): Promise<SubmitOpResult> {
  // ── Deduplication ──────────────────────────────────────────────────────────
  if (clientId) {
    const dup = await isDuplicate(docId, clientId);
    if (dup) {
      logger.debug(`Duplicate op skipped: ${clientId}`);
      // Return current version without error
      const doc = await DocumentModel.findById(docId).lean().select('currentVersion');
      const content = (await redis.get(contentKey(docId))) ?? '';
      return { version: (doc as {currentVersion:number}).currentVersion, content, isSnapshot: false };
    }
  }

  // ── Atomic version assignment ──────────────────────────────────────────────
  const version = await incrementDocVersion(docId);

  // ── Apply CRDT op to in-memory state ──────────────────────────────────────
  const rawState = await redis.get(contentKey(docId));
  const crdtDoc = rawState ? deserializeDocument(rawState) : createCRDTDocument();

  const siteId = userId; // Use userId as CRDT site identifier
  const newCrdtDoc = applyOp(crdtDoc, op, siteId);
  const serialized = serializeDocument(newCrdtDoc);

  // ── Persist operation to MongoDB ───────────────────────────────────────────
  await Operation.create({
    docId: new Types.ObjectId(docId),
    userId: new Types.ObjectId(userId),
    op,
    version,
    clientId,
    timestamp: new Date(),
  });

  // ── Update Redis state ─────────────────────────────────────────────────────
  await redis.setex(contentKey(docId), 3600, serialized);

  // ── Snapshot check ─────────────────────────────────────────────────────────
  let isSnapshot = false;
  if (version % env.SNAPSHOT_INTERVAL === 0) {
    isSnapshot = true;
    // Fire-and-forget (don't block the operation response)
    takeSnapshot(docId, serialized, version).catch((err) =>
      logger.error('Snapshot failed', { docId, version, err })
    );
  }

  // Return the visible text (not the raw CRDT structure)
  const doc2 = deserializeDocument(serialized);
  const visibleText = doc2.chars.filter(c => !c.deleted).map(c => c.char).join('');

  return { version, content: visibleText, isSnapshot };
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

async function takeSnapshot(
  docId: string,
  serializedState: string,
  versionNumber: number
): Promise<void> {
  await Version.create({
    docId: new Types.ObjectId(docId),
    snapshot: serializedState,
    versionNumber,
  });
  logger.info(`Snapshot taken for doc ${docId} at version ${versionNumber}`);
}

// ─── Reconstruction (for reconnect sync) ─────────────────────────────────────

/**
 * Reconstructs document content from the latest snapshot + ops since then.
 * Called when a client reconnects and needs to catch up.
 *
 * @param docId - Document to reconstruct
 * @param fromVersion - The last version the client had (0 = full reconstruction)
 */
export async function reconstructDocument(
  docId: string,
  fromVersion = 0
): Promise<{ content: string; version: number }> {
  // 1. Try Redis first (fast path)
  const cached = await redis.get(contentKey(docId));
  if (cached && fromVersion === 0) {
    const doc2 = deserializeDocument(cached);
    const visibleText = doc2.chars.filter(c => !c.deleted).map(c => c.char).join('');
    const docMeta = await DocumentModel.findById(docId).lean().select('currentVersion');
    return { content: visibleText, version: (docMeta as {currentVersion:number}).currentVersion };
  }

  // 2. Find the latest snapshot at or before fromVersion's next snapshot
  const latestSnapshot = await Version.findOne({
    docId: new Types.ObjectId(docId),
  })
    .sort({ versionNumber: -1 })
    .lean();

  let crdtDoc = latestSnapshot
    ? deserializeDocument(latestSnapshot.snapshot)
    : createCRDTDocument();

  const snapshotVersion = latestSnapshot?.versionNumber ?? 0;

  // 3. Replay operations after the snapshot version
  const ops = await Operation.find({
    docId: new Types.ObjectId(docId),
    version: { $gt: snapshotVersion },
  })
    .sort({ version: 1 })
    .lean();

  for (const op of ops) {
    crdtDoc = applyOp(crdtDoc, op.op, op.userId.toString());
  }

  const visibleText = crdtDoc.chars.filter(c => !c.deleted).map(c => c.char).join('');
  const serialized = serializeDocument(crdtDoc);

  // Cache the reconstructed state
  await redis.setex(contentKey(docId), 3600, serialized);

  const docMeta = await DocumentModel.findById(docId).lean().select('currentVersion');
  return { content: visibleText, version: (docMeta as {currentVersion:number}).currentVersion };
}

// ─── Rollback ─────────────────────────────────────────────────────────────────

/**
 * Rolls back a document to a specific version by replaying ops up to that version.
 * Creates a new snapshot at the rollback point and updates currentVersion.
 */
export async function rollbackToVersion(
  docId: string,
  targetVersion: number
): Promise<string> {
  if (targetVersion < 0) {
    throw new AppError('Target version must be ≥ 0', 400, 'INVALID_VERSION');
  }

  // Find the best snapshot at or before target version
  const snapshot = await Version.findOne({
    docId: new Types.ObjectId(docId),
    versionNumber: { $lte: targetVersion },
  })
    .sort({ versionNumber: -1 })
    .lean();

  let crdtDoc = snapshot ? deserializeDocument(snapshot.snapshot) : createCRDTDocument();
  const snapshotVersion = snapshot?.versionNumber ?? 0;

  // Replay ops from snapshot to target version
  const ops = await Operation.find({
    docId: new Types.ObjectId(docId),
    version: { $gt: snapshotVersion, $lte: targetVersion },
  })
    .sort({ version: 1 })
    .lean();

  for (const op of ops) {
    crdtDoc = applyOp(crdtDoc, op.op, op.userId.toString());
  }

  const serialized = serializeDocument(crdtDoc);
  const visibleText = crdtDoc.chars.filter(c => !c.deleted).map(c => c.char).join('');

  // Save new snapshot + update document version
  await Promise.all([
    Version.create({
      docId: new Types.ObjectId(docId),
      snapshot: serialized,
      versionNumber: targetVersion,
    }),
    DocumentModel.findByIdAndUpdate(docId, { currentVersion: targetVersion }),
    redis.setex(contentKey(docId), 3600, serialized),
  ]);

  logger.info(`Document ${docId} rolled back to version ${targetVersion}`);
  return visibleText;
}

// ─── Version history ──────────────────────────────────────────────────────────

export async function getVersionHistory(docId: string) {
  return Version.find({ docId: new Types.ObjectId(docId) })
    .sort({ versionNumber: -1 })
    .select({ snapshot: 0 }) // Exclude snapshot blob for list view
    .lean();
}
