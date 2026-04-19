import { redis } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Redis Streams Service
 *
 * Provides durable, ordered event streaming for CRDT operations.
 * Uses Redis Streams (XADD/XREADGROUP) as a lightweight alternative to Kafka.
 *
 * Architecture:
 * - Producer: called by the WebSocket edit handler after op is persisted
 * - Consumer group: one group per application, one consumer per process instance
 * - Multiple server instances each read their share of events (competing consumers)
 *
 * Why Redis Streams over Kafka?
 * - Zero additional infrastructure for single-cluster deployments
 * - Supports consumer groups, acknowledgment, and replay
 * - Kafka is swap-in if event volume exceeds Redis capacity
 *
 * Stream message fields:
 * - docId, userId, version, op (JSON-serialized CRDTOp), timestamp
 */

const STREAM = env.STREAM_NAME;
const GROUP = env.STREAM_GROUP;
const CONSUMER_ID = `consumer-${process.pid}`;

// ─── Producer ─────────────────────────────────────────────────────────────────

export interface StreamOpMessage {
  docId: string;
  userId: string;
  version: number;
  op: string;      // JSON.stringify(CRDTOp)
  timestamp: string;
}

/**
 * Publishes a CRDT op event to the Redis Stream.
 * XADD with '*' lets Redis assign the ID (timestamp-based).
 */
export async function publishOp(msg: StreamOpMessage): Promise<void> {
  await redis.xadd(
    STREAM,
    'MAXLEN', '~', '100000', // Approximate trimming to ~100K entries
    '*',
    'docId', msg.docId,
    'userId', msg.userId,
    'version', String(msg.version),
    'op', msg.op,
    'timestamp', msg.timestamp
  );
}

// ─── Consumer group setup ─────────────────────────────────────────────────────

/**
 * Initializes the consumer group. Safe to call multiple times — ignores
 * BUSYGROUP error if group already exists.
 */
export async function initConsumerGroup(): Promise<void> {
  try {
    // '$' means: start consuming new messages only (not historical)
    await redis.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM');
    logger.info(`Redis Streams consumer group "${GROUP}" created`);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('BUSYGROUP')) {
      // Group already exists — fine on restart
      logger.debug(`Consumer group "${GROUP}" already exists`);
    } else {
      throw err;
    }
  }
}

// ─── Consumer ─────────────────────────────────────────────────────────────────

type StreamEntry = [id: string, fields: string[]];

/**
 * Reads a batch of messages from the stream.
 * Uses XREADGROUP so each message is delivered to exactly ONE consumer instance.
 *
 * @param handler - async function to process each message
 * @param batchSize - number of messages to read per poll
 */
export async function consumeOps(
  handler: (msg: StreamOpMessage & { streamId: string }) => Promise<void>,
  batchSize = env.STREAM_BATCH_SIZE
): Promise<void> {
  const result = (await redis.xreadgroup(
    'GROUP', GROUP, CONSUMER_ID,
    'COUNT', String(batchSize),
    'BLOCK', '2000', // Block 2s waiting for messages
    'STREAMS', STREAM, '>'
  )) as Array<[string, StreamEntry[]]> | null;

  if (!result || result.length === 0) return;

  const [, entries] = result[0]!;

  for (const [streamId, fields] of entries) {
    // Redis XREAD returns flat [key, value, key, value...] array
    const obj: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      obj[fields[i]!] = fields[i + 1]!;
    }

    try {
      await handler({
        streamId,
        docId: obj['docId']!,
        userId: obj['userId']!,
        version: parseInt(obj['version']!, 10),
        op: obj['op']!,
        timestamp: obj['timestamp']!,
      });

      // Acknowledge processed message
      await redis.xack(STREAM, GROUP, streamId);
    } catch (err) {
      logger.error('Stream consumer handler error', { streamId, err });
      // Message stays in PEL for retry — consumer can claim after timeout
    }
  }
}

/**
 * Starts a polling loop for stream consumption.
 * Call this once at server startup.
 */
export async function startStreamConsumer(
  handler: (msg: StreamOpMessage & { streamId: string }) => Promise<void>
): Promise<void> {
  await initConsumerGroup();
  logger.info('Redis Streams consumer started');

  // Self-rescheduling poll loop (not blocking the event loop)
  const poll = async (): Promise<void> => {
    try {
      await consumeOps(handler);
    } catch (err) {
      logger.error('Stream consumer poll error', { err });
    }
    setImmediate(poll); // next tick, non-blocking
  };

  poll();
}
