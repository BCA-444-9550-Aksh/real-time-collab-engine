import { create } from 'zustand';

export interface ActiveUser {
  userId: string;
  name: string;
  color: string;
  cursor?: { pos: number };
}

interface CollaborationState {
  activeUsers: ActiveUser[];
  connected: boolean;
  typingUsers: string[];

  setConnected: (v: boolean) => void;
  setActiveUsers: (users: ActiveUser[]) => void;
  addUser: (user: ActiveUser) => void;
  removeUser: (userId: string) => void;
  updateCursor: (userId: string, pos: number) => void;
  setTyping: (userId: string, isTyping: boolean) => void;
  reset: () => void;
}

// Distinct, visually separated colors for remote cursors
const CURSOR_COLORS = [
  '#f97316', '#22d3ee', '#a78bfa', '#34d399',
  '#fb7185', '#fbbf24', '#60a5fa', '#4ade80',
];

let colorIndex = 0;
export function getNextCursorColor() {
  return CURSOR_COLORS[colorIndex++ % CURSOR_COLORS.length];
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
  activeUsers: [],
  connected: false,
  typingUsers: [],

  setConnected: (connected) => set({ connected }),

  setActiveUsers: (users) => set({ activeUsers: users }),

  addUser: (user) =>
    set((s) => ({
      activeUsers: s.activeUsers.some((u) => u.userId === user.userId)
        ? s.activeUsers
        : [...s.activeUsers, user],
    })),

  removeUser: (userId) =>
    set((s) => ({
      activeUsers: s.activeUsers.filter((u) => u.userId !== userId),
      typingUsers: s.typingUsers.filter((id) => id !== userId),
    })),

  updateCursor: (userId, pos) =>
    set((s) => ({
      activeUsers: s.activeUsers.map((u) =>
        u.userId === userId ? { ...u, cursor: { pos } } : u
      ),
    })),

  setTyping: (userId, isTyping) =>
    set((s) => ({
      typingUsers: isTyping
        ? [...new Set([...s.typingUsers, userId])]
        : s.typingUsers.filter((id) => id !== userId),
    })),

  reset: () => set({ activeUsers: [], connected: false, typingUsers: [] }),
}));
