import winston from 'winston';
import path from 'path';
import { env } from './env';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const logDir = 'logs';

/**
 * Structured logger using Winston.
 * - In development: pretty-printed console output
 * - In production: JSON to stdout + rotating file transports
 */
export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),   // capture stack traces
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    json()
  ),
  defaultMeta: { service: 'collab-engine' },
  transports: [
    // Console
    new winston.transports.Console({
      format:
        env.NODE_ENV === 'development'
          ? combine(colorize(), simple())
          : combine(timestamp(), json()),
    }),
    // Error file
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,  // 10 MB
      maxFiles: 5,
    }),
    // Combined file
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 20 * 1024 * 1024,  // 20 MB
      maxFiles: 10,
    }),
  ],
});

// Morgan-compatible stream for HTTP request logging
export const morganStream = {
  write: (message: string) => logger.http(message.trim()),
};
