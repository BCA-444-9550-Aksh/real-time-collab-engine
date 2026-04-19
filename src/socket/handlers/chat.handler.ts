import { Socket, Server } from 'socket.io';
import { Types } from 'mongoose';
import { Message } from '../../models/Message';
import { SocketUser } from '../../types';
import { logger } from '../../config/logger';

/**
 * Chat Handler — real-time document-scoped chat.
 *
 * Event: `chat_message`
 * Payload:
 *   - docId: string
 *   - text: string (max 2000 chars)
 *
 * Flow:
 * 1. Validate message
 * 2. Persist to MongoDB (Message collection)
 * 3. Broadcast to all clients in the room (including sender)
 *
 * Note: Chat messages are broadcast via Socket.IO room and persisted to
 * MongoDB. Historical messages are fetched via REST (GET /api/docs/:id/messages).
 */
export function registerChatHandlers(io: Server, socket: Socket): void {
  const user = socket.data['user'] as SocketUser;

  socket.on(
    'chat_message',
    async (
      payload: { docId: string; text: string },
      ack?: Function
    ) => {
      const { docId, text } = payload;

      if (!docId || typeof text !== 'string' || text.trim().length === 0) {
        if (typeof ack === 'function') ack({ success: false, message: 'Invalid message payload' });
        return;
      }

      const trimmed = text.trim().slice(0, 2000); // Server-side enforcement

      try {
        const message = await Message.create({
          docId: new Types.ObjectId(docId),
          userId: new Types.ObjectId(user.id),
          text: trimmed,
        });

        const broadcast = {
          id: message.id,
          docId,
          userId: user.id,
          userName: user.name,
          text: trimmed,
          createdAt: message.createdAt,
        };

        // Broadcast to entire room (including sender)
        io.to(`doc:${docId}`).emit('new_message', broadcast);

        if (typeof ack === 'function') ack({ success: true, messageId: message.id });

        logger.debug(`Chat message: doc=${docId} user=${user.id} len=${trimmed.length}`);
      } catch (err) {
        logger.error('chat_message error', { userId: user.id, docId, err });
        if (typeof ack === 'function') ack({ success: false, message: 'Failed to send message' });
      }
    }
  );
}
