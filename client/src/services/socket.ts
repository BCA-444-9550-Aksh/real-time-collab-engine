import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const raw = localStorage.getItem('collab-auth');
    let token = '';
    try { token = JSON.parse(raw!).state.token; } catch { /* */ }

    socket = io('/', {
      path: '/socket.io',
      auth: { token },
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
