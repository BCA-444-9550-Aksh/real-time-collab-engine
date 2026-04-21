import { Socket, Server } from 'socket.io';
import * as presenceService from '../../services/presence.service';
import { SocketUser } from '../../types';

/**
 * Cursor Handler — broadcasts cursor position updates.
 *
 * Event: `cursor_move`
 * Payload:
 *   - docId: string
 *   - pos: number (character index in visible text)
 *   - color: string (hex color assigned by client)
 *
 * Design:
 * - Cursor positions are stored in Redis (hash per doc) for new joiners
 * - Updates are broadcast to all OTHER clients in the room (not sender)
 * - Cursor updates are high-frequency; no persistence to MongoDB
 * - Client should throttle to max 60 fps (~16ms)
 *
 * The `color` is assigned by the client from a deterministic palette
 * based on their userId to ensure consistent color across all viewers.
 */
export function registerCursorHandlers(_io: Server, socket: Socket): void {
  const user = socket.data['user'] as SocketUser;

  socket.on(
    'cursor_move',
    async (payload: { docId: string; pos: number; color: string }) => {
      const { docId, pos, color } = payload;

      if (!docId || typeof pos !== 'number') return;

      // Store in Redis for new joiners
      await presenceService.setCursor(docId, user.id, pos).catch(() => null);

      // Broadcast to all others in the room (exclude sender)
      socket.to(`doc:${docId}`).emit('cursor_update', {
        userId: user.id,
        name: user.name,
        pos,
        color,
      });
    }
  );
}
