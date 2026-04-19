import { Socket, Server } from 'socket.io';
import * as opService from '../../services/operation.service';
import { publishOp } from '../../services/stream.service';
import { SocketUser, CRDTOp } from '../../types';
import { logger } from '../../config/logger';

/**
 * Edit Handler — core CRDT operation processing.
 *
 * Event: `edit`
 * Payload:
 *   - docId: string
 *   - op: CRDTOp { type, pos, text?, length?, attrs? }
 *   - clientId: string  (UUID for deduplication on reconnect)
 *   - baseVersion: number (the version this op was made against)
 *
 * Flow:
 * 1. Submit op to the operation service (dedup + CRDT apply + persist + Redis update)
 * 2. Publish to Redis Streams for durable propagation across server nodes
 * 3. Broadcast `op_applied` to all clients in the room (including sender)
 *    — sender uses this to confirm their optimistic update
 *
 * Error handling:
 * - Invalid op: emit `op_rejected` to sender only
 * - Access denied: disconnect socket
 *
 * Throttling:
 * - Client is responsible for debouncing (10–50ms window recommended)
 * - Server applies ops as fast as they arrive
 */

// Debounce map: tracks pending batch per (socket, docId) — server-side safety net
const pendingOps = new Map<string, ReturnType<typeof setTimeout>>();

export function registerEditHandlers(io: Server, socket: Socket): void {
  const user = socket.data['user'] as SocketUser;

  socket.on(
    'edit',
    async (
      payload: {
        docId: string;
        op: CRDTOp;
        clientId: string;
        baseVersion: number;
      },
      ack?: Function
    ) => {
      const { docId, op, clientId, baseVersion } = payload;

      // Basic payload validation
      if (!docId || !op || !op.type || typeof op.pos !== 'number') {
        const msg = 'Invalid edit payload';
        socket.emit('op_rejected', { clientId, reason: msg });
        if (typeof ack === 'function') ack({ success: false, message: msg });
        return;
      }

      try {
        // Submit the operation (includes access check via version increment)
        const { version, content, isSnapshot } = await opService.submitOperation(
          docId,
          user.id,
          op,
          clientId
        );

        // Publish to Redis Streams for cross-node propagation
        await publishOp({
          docId,
          userId: user.id,
          version,
          op: JSON.stringify(op),
          timestamp: new Date().toISOString(),
        });

        // Broadcast to all clients in the room (including the sender)
        io.to(`doc:${docId}`).emit('op_applied', {
          docId,
          op,
          version,
          userId: user.id,
          clientId,
          content, // Unconditionally send content to guarantee frontend sync
        });

        if (typeof ack === 'function') ack({ success: true, version });

        logger.debug(`Op applied: doc=${docId} v=${version} user=${user.id} type=${op.type}`);
      } catch (err) {
        logger.error('edit handler error', { userId: user.id, docId, clientId, err });
        const message = err instanceof Error ? err.message : 'Failed to apply edit';
        socket.emit('op_rejected', { clientId, reason: message });
        if (typeof ack === 'function') ack({ success: false, message });
      }
    }
  );
}
