import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { JwtAccessPayload, SocketUser } from '../../types';
import { User } from '../../models/User';
import { logger } from '../../config/logger';

/**
 * Socket.IO Authentication Middleware
 *
 * Validates the JWT sent during the WebSocket handshake.
 * Token must be provided in socket.handshake.auth.token.
 *
 * Any socket that fails authentication is disconnected immediately;
 * no event handlers are registered for unauthenticated connections.
 *
 * Usage (client side):
 *   const socket = io('http://localhost:4000', {
 *     auth: { token: '<access_token>' }
 *   });
 */
export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  const token = socket.handshake.auth?.['token'] as string | undefined;

  if (!token) {
    logger.warn(`Socket ${socket.id} — missing auth token`);
    return next(new Error('Authentication token is required'));
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;

    // Fetch fresh user to ensure they still exist
    const user = await User.findById(payload.sub).lean().select('name email role');
    if (!user) {
      return next(new Error('User not found'));
    }

    // Attach to socket data for use in event handlers
    const socketUser: SocketUser = {
      id: (user._id as { toString(): string }).toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    socket.data['user'] = socketUser;

    logger.debug(`Socket authenticated: ${socket.id} → user ${socketUser.id}`);
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new Error('Token expired — please refresh'));
    }
    return next(new Error('Invalid token'));
  }
}
