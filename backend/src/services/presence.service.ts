import { redis } from '../config/redis';
import { SocketUser } from '../types';

const PRESENCE_TTL = 30; // seconds — clients must heartbeat to stay listed
const PRESENCE_PREFIX = 'presence:';

/**
 * Presence Service
 *
 * Tracks which users are currently in a document room using Redis hashes.
 * Each document has a Redis hash: `presence:<docId>`
 * Each field in the hash is a userId, value is serialized SocketUser + timestamp.
 *
 * TTL is set per-hash (not per-field), so we use a "heartbeat" pattern:
 * each client socket heartbeat refreshes the hash TTL.
 *
 * This design supports horizontal scaling: any server node reads from Redis.
 */

function presenceKey(docId: string): string {
  return `${PRESENCE_PREFIX}${docId}`;
}

/**
 * Adds or updates a user in the presence map for a document.
 */
export async function addPresence(docId: string, user: SocketUser): Promise<void> {
  const key = presenceKey(docId);
  await redis.hset(key, user.id, JSON.stringify({ ...user, joinedAt: new Date().toISOString() }));
  await redis.expire(key, PRESENCE_TTL * 10); // reset TTL for the entire hash
}

/**
 * Removes a user from the presence map.
 */
export async function removePresence(docId: string, userId: string): Promise<void> {
  await redis.hdel(presenceKey(docId), userId);
}

/**
 * Returns all active users in a document.
 */
export async function getPresence(docId: string): Promise<SocketUser[]> {
  const raw = await redis.hgetall(presenceKey(docId));
  if (!raw) return [];

  return Object.values(raw).map((v) => JSON.parse(v) as SocketUser);
}

/**
 * Heartbeat: refreshes the hash TTL to keep the user "online".
 * Called by the client every ~10 seconds.
 */
export async function heartbeat(docId: string): Promise<void> {
  await redis.expire(presenceKey(docId), PRESENCE_TTL * 10);
}

/**
 * Stores a user's cursor position in Redis.
 * Stored as a separate hash `cursor:<docId>` for fast broadcast.
 */
export async function setCursor(docId: string, userId: string, pos: number): Promise<void> {
  const key = `cursor:${docId}`;
  await redis.hset(key, userId, String(pos));
  await redis.expire(key, PRESENCE_TTL * 10);
}

/**
 * Gets all cursor positions for a document.
 */
export async function getCursors(docId: string): Promise<Record<string, number>> {
  const raw = await redis.hgetall(`cursor:${docId}`);
  if (!raw) return {};

  return Object.fromEntries(
    Object.entries(raw).map(([uid, pos]) => [uid, parseInt(pos, 10)])
  );
}
