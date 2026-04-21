import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

/**
 * Connects to MongoDB using Mongoose.
 * Retries on failure with exponential backoff.
 */
export async function connectDB(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () =>
    logger.info('✅  MongoDB connected')
  );
  mongoose.connection.on('error', (err) =>
    logger.error('MongoDB connection error', { err })
  );
  mongoose.connection.on('disconnected', () =>
    logger.warn('MongoDB disconnected — attempting reconnect…')
  );

  await mongoose.connect(env.MONGO_URI, {
    // Optimal pool for 50+ concurrent users per doc
    maxPoolSize: 50,
    minPoolSize: 5,
    socketTimeoutMS: 45_000,
    serverSelectionTimeoutMS: 5_000,
  });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.connection.close();
  logger.info('MongoDB disconnected gracefully');
}
