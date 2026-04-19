import { Socket, Server } from 'socket.io';
import * as presenceService from '../../services/presence.service';
import * as docService from '../../services/document.service';
import * as opService from '../../services/operation.service';
import { SocketUser } from '../../types';
import { logger } from '../../config/logger';

/**
 * Presence Handler — manages join_doc / leave_doc events.
 *
 * join_doc:
 *   1. Verify user has access to the document
 *   2. Join the socket.io room for the document
 *   3. Add user to Redis presence hash
 *   4. Send current document state + active users to the joining client
 *   5. Broadcast updated presence list to room
 *
 * leave_doc:
 *   1. Remove from presence
 *   2. Leave the room
 *   3. Broadcast updated presence
 *
 * disconnect:
 *   Handles ungraceful disconnects (same as leave_doc for all joined rooms)
 */
export function registerPresenceHandlers(io: Server, socket: Socket): void {
  const user = socket.data['user'] as SocketUser;

  // ── join_doc ────────────────────────────────────────────────────────────────
  socket.on(
    'join_doc',
    async (payload: { docId: string; fromVersion?: number }, ack?: Function) => {
      const { docId, fromVersion } = payload;

      try {
        // Access control — throws 403 if no access
        await docService.assertDocAccess(docId, user.id);

        // Join Socket.IO room
        await socket.join(`doc:${docId}`);

        // Track joined rooms on socket for disconnect cleanup
        if (!socket.data['rooms']) socket.data['rooms'] = new Set<string>();
        (socket.data['rooms'] as Set<string>).add(docId);

        // Update Redis presence
        await presenceService.addPresence(docId, user);

        // Get current document state (reconstruct if needed)
        const { content, version } = await opService.reconstructDocument(docId, fromVersion ?? 0);

        // Get all currently online users
        const activeUsers = await presenceService.getPresence(docId);

        // Send document state to the joining client
        socket.emit('doc_state', { docId, content, version, activeUsers });

        // Broadcast new user joined to everyone else in the room
        socket.to(`doc:${docId}`).emit('user_joined', {
          docId,
          user,
          activeUsers,
        });

        logger.debug(`User ${user.id} joined doc ${docId}`);

        // Acknowledge success if callback provided
        if (typeof ack === 'function') ack({ success: true });
      } catch (err) {
        logger.error('join_doc error', { userId: user.id, docId, err });
        const message = err instanceof Error ? err.message : 'Failed to join document';
        if (typeof ack === 'function') ack({ success: false, message });
        socket.emit('error', { message });
      }
    }
  );

  // ── leave_doc ───────────────────────────────────────────────────────────────
  socket.on('leave_doc', async (payload: { docId: string }) => {
    await handleLeave(io, socket, user, payload.docId);
  });

  // ── disconnect (ungraceful) ─────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    const rooms = (socket.data['rooms'] as Set<string>) ?? new Set();
    for (const docId of rooms) {
      await handleLeave(io, socket, user, docId);
    }
    logger.debug(`Socket disconnected: ${socket.id}`);
  });

  // ── heartbeat (keep presence alive) ────────────────────────────────────────
  socket.on('heartbeat', async (payload: { docId: string }) => {
    await presenceService.heartbeat(payload.docId).catch(() => null);
  });
}

async function handleLeave(
  io: Server,
  socket: Socket,
  user: SocketUser,
  docId: string
): Promise<void> {
  await presenceService.removePresence(docId, user.id);
  socket.leave(`doc:${docId}`);

  const activeUsers = await presenceService.getPresence(docId);

  io.to(`doc:${docId}`).emit('user_left', {
    docId,
    userId: user.id,
    activeUsers,
  });

  logger.debug(`User ${user.id} left doc ${docId}`);
}
