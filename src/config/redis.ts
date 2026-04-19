import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  // Retry strategy: exponential backoff, max 30s
  retryStrategy: (times: number) => Math.min(times * 100, 30_000),
  enableReadyCheck: true,
  maxRetriesPerRequest: null, // retry indefinitely — don't throw on connection failure
  lazyConnect: false,
};

/**
 * Primary Redis client — used for caching, presence, and general commands.
 */
export const redis = new Redis(redisConfig);

/**
 * Dedicated pub client for Socket.IO Redis adapter.
 * Must be a separate connection (can't be shared with regular commands).
 */
export const redisPub = new Redis(redisConfig);

/**
 * Dedicated sub client for Socket.IO Redis adapter.
 */
export const redisSub = new Redis(redisConfig);

function attachEvents(client: Redis, name: string): void {
  client.on('connect', () => logger.info(`✅  Redis client [${name}] connected`));
  client.on('error', (err) => logger.error(`Redis client [${name}] error`, { err }));
  client.on('reconnecting', () => logger.warn(`Redis client [${name}] reconnecting…`));
}

attachEvents(redis, 'main');
attachEvents(redisPub, 'pub');
attachEvents(redisSub, 'sub');

export async function quitRedis(): Promise<void> {
  await Promise.all([redis.quit(), redisPub.quit(), redisSub.quit()]);
  logger.info('Redis clients disconnected gracefully');
}
