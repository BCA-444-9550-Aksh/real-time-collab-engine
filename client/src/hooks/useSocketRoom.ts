import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../services/socket';
import { useCollaborationStore, getNextCursorColor } from '../store/collaborationStore';
import { useChatStore } from '../store/chatStore';
import { useDocumentStore } from '../store/documentStore';
import { useAuthStore } from '../store/authStore';

export function useSocketRoom(docId: string) {
  const socket = getSocket();
  const { addUser, removeUser, setConnected, updateCursor, reset } = useCollaborationStore();
  const { addMessage } = useChatStore();
  const { setContent, setVersion } = useDocumentStore();
  const { user } = useAuthStore();
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!docId || joinedRef.current) return;
    joinedRef.current = true;

    // ─── Connection ───────────────────────────────────────────
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // ─── Join doc room ────────────────────────────────────────
    socket.emit('join_doc', { docId });

    // ─── Presence ─────────────────────────────────────────────
    socket.on('user_joined', (payload: { user: { id: string; name: string }; activeUsers: Array<{ id: string; name: string }> }) => {
      addUser({ userId: payload.user.id, name: payload.user.name, color: getNextCursorColor() });
    });
    
    socket.on('user_left', (payload: { userId: string }) => {
      removeUser(payload.userId);
    });
    
    socket.on('doc_state', (payload: { content: string; version: number; activeUsers: Array<{ id: string; name: string }> }) => {
      // We rely on HTTP fetch for content, but we ingest the presence list here
      payload.activeUsers
        .filter((u) => u.id !== user?.id)
        .forEach((u) => addUser({ userId: u.id, name: u.name, color: getNextCursorColor() }));
    });

    // ─── Cursor ───────────────────────────────────────────────
    socket.on('cursor_update', ({ userId, pos }: { userId: string; pos: number }) => {
      updateCursor(userId, pos);
    });

    // ─── Edit ─────────────────────────────────────────────────
    socket.on('op_applied', (payload: { content: string; version: number }) => {
      setContent(payload.content);
      setVersion(payload.version);
    });

    // ─── Chat ─────────────────────────────────────────────────
    socket.on('new_message', (msg: any) => {
      addMessage(msg);
    });

    return () => {
      socket.emit('leave_doc', { docId });
      socket.off('connect');
      socket.off('disconnect');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('doc_state');
      socket.off('cursor_update');
      socket.off('op_applied');
      socket.off('new_message');
      joinedRef.current = false;
      reset();
    };
  }, [docId]);

  const sendEdit = useCallback((op: object, version: number, content: string) => {
    // Generate an ephemeral clientId to track ops reliably during deduplication
    const clientId = Math.random().toString(36).substring(7);
    socket.emit('edit', { docId, op, baseVersion: version, clientId });
  }, [docId]);

  // Memoize it roughly so color stays somewhat stable or just pass random
  const sendCursor = useCallback((pos: number) => {
    // Basic hash to generate consistent color for myself based on user ID
    const hash = user?.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) || 1;
    const color = `hsl(${(hash * 137) % 360}, 70%, 50%)`;
    socket.emit('cursor_move', { docId, pos, color });
  }, [docId, user]);

  const sendChat = useCallback((text: string) => {
    socket.emit('chat_message', { docId, text });
  }, [docId]);

  return { sendEdit, sendCursor, sendChat };
}
