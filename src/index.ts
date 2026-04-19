/**
 * Application entry point.
 *
 * Boot order:
 *  1. Load & validate environment variables  (env.ts — side-effect on import)
 *  2. Connect to MongoDB
 *  3. Warm Redis connections
 *  4. Start Redis Streams consumer
 *  5. Create Express app
 *  6. Attach Socket.IO server
 *  7. Start HTTP listener
 *  8. Register graceful-shutdown handlers
 */

import http from 'http';

import { env }        from './config/env';
import { logger }     from './config/logger';
import { connectDB }  from './config/db';
import { redis, redisPub, redisSub, quitRedis } from './config/redis';

import { createApp }          from './app';
import { createSocketServer } from './socket';
import { startStreamConsumer } from './services/stream.service';

// ─── Bootstrap ───────────────────────────────────────────────────────────────

async function bootstrap() {
  try {
    // 1. MongoDB
    await connectDB();

    // 2. Redis — ioredis connects automatically in the background and retries.
    //    We deliberately do NOT await a ping here so the HTTP server can start
    //    even if Redis is momentarily unavailable (it will reconnect).
    logger.info('⏳  Redis clients initialised — connecting in background...');

    // 3. Express HTTP server
    const app    = createApp();
    const server = http.createServer(app);

    // 4. Socket.IO (attaches to the same HTTP server)
    createSocketServer(server);

    // 5. Redis Streams consumer (starts background poll loop)
    //    Provides a default no-op handler — real processing is done
    //    inside the edit handler via the operation service.
    await startStreamConsumer(async (msg) => {
      logger.debug('Stream op received', {
        docId:   msg.docId,
        userId:  msg.userId,
        version: msg.version,
        streamId: msg.streamId,
      });
    });

    // 6. Listen
    server.listen(env.PORT, () => {
      logger.info(
        `🚀  Server listening on http://localhost:${env.PORT}  [${env.NODE_ENV}]`,
      );
      logger.info(
        `📖  Swagger UI available at http://localhost:${env.PORT}/api/docs`,
      );
    });

    // ─── Graceful Shutdown ────────────────────────────────────────────────────
    const shutdown = async (signal: string) => {
      logger.info(`\n⚠️   ${signal} received — shutting down gracefully...`);

      // Stop accepting new connections; wait for in-flight requests
      server.close(async () => {
        try {
          await quitRedis();
          logger.info('✅  Graceful shutdown complete. Bye!');
          process.exit(0);
        } catch (err) {
          logger.error('Shutdown error', err);
          process.exit(1);
        }
      });

      // Force-kill if graceful shutdown stalls after 10s
      setTimeout(() => {
        logger.error('🔴  Forced shutdown after timeout.');
        process.exit(1);
      }, 10_000).unref();
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT',  () => void shutdown('SIGINT'));

    // Unhandled rejections / exceptions — log and exit so PM2 / k8s restarts us
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', reason);
      process.exit(1);
    });
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', err);
      process.exit(1);
    });
  } catch (err) {
    logger.error('❌  Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
