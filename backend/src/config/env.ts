import 'dotenv/config'; // loads .env into process.env BEFORE validation
import { z } from 'zod';

/**
 * Validates and exports all required environment variables with strong types.
 * The server will refuse to start if any required variable is missing.
 */
const envSchema = z.object({
  PORT: z.string().default('4000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // MongoDB
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS — comma-separated
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX_AUTH: z.string().default('20').transform(Number),
  RATE_LIMIT_MAX_API: z.string().default('500').transform(Number),

  // Snapshots
  SNAPSHOT_INTERVAL: z.string().default('50').transform(Number),

  // Redis Streams
  STREAM_NAME: z.string().default('collab:ops'),
  STREAM_GROUP: z.string().default('collab-consumers'),
  STREAM_BATCH_SIZE: z.string().default('100').transform(Number),
});

const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('❌  Invalid environment variables:');
  console.error(_parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = _parsed.data;
export type Env = typeof env;
