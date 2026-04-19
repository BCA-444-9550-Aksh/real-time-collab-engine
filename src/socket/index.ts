import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisPub, redisSub } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { socketAuthMiddleware } from './middleware/socketAuth';
import { registerPresenceHandlers } from './handlers/presence.handler';
import { registerEditHandlers } from './handlers/edit.handler';
import { registerCursorHandlers } from './handlers/cursor.handler';
import { registerChatHandlers } from './handlers/chat.handler';

/**
 * Socket.IO Server Setup
 *
 * Architecture:
 * - Uses @socket.io/redis-adapter so multiple server instances share rooms.
 *   Any message emitted on instance A is delivered to clients on instance B.
 *
 * - Authentication happens in the middleware layer before any handler runs.
 *
 * - Each document gets a dedicated Socket.IO room: `doc:<docId>`
 *   All events scoped to a document use room-targeted emit.
 *
 * - Event registration is modular — one function per domain.
 *
 * Scaling to 50+ concurrent users per document:
 * - Socket.IO's Redis adapter handles fan-out via pub/sub
 * - Redis presence hash is the single source of truth for who is online
 * - Each server node handles its own connections; Redis bridges the gap
 */
export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
    },
    // Compression reduces payload size by ~70% for text operations
    perMessageDeflate: true,
    // Transport: prefer WebSocket, fall back to polling
    transports: ['websocket', 'polling'],
    // Ping settings for connection health
    pingTimeout: 10_000,
    pingInterval: 25_000,
    // Max HTTP buffer for large reconnect payloads
    maxHttpBufferSize: 1e6, // 1 MB
  });

  // ── Redis Adapter (horizontal scaling) ────────────────────────────────────
  io.adapter(createAdapter(redisPub, redisSub));
  logger.info('Socket.IO Redis adapter attached');

  // ── Authentication middleware ──────────────────────────────────────────────
  io.use(socketAuthMiddleware);

  // ── Per-connection handler registration ───────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const user = socket.data['user'];
    logger.info(`Socket connected: ${socket.id} → user=${user?.id}`);

    // Register all event handlers
    registerPresenceHandlers(io, socket);
    registerEditHandlers(io, socket);
    registerCursorHandlers(io, socket);
    registerChatHandlers(io, socket);

    // Generic error handler for this socket
    socket.on('error', (err) => {
      logger.error(`Socket error [${socket.id}]`, { err });
    });
  });

  return io;
}
