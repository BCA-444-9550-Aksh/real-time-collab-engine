import { create } from 'zustand';
import api from '../services/api';

export interface ChatMessage {
  _id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  hasMore: boolean;
  cursor: string | null;

  toggleChat: () => void;
  fetchMessages: (docId: string, reset?: boolean) => Promise<void>;
  addMessage: (msg: ChatMessage) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isOpen: false,
  isLoading: false,
  hasMore: true,
  cursor: null,

  toggleChat: () => set((s) => ({ isOpen: !s.isOpen })),

  fetchMessages: async (docId, reset = false) => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const params: Record<string, string> = { limit: '30' };
      if (!reset && get().cursor) params.cursor = get().cursor!;

      const { data } = await api.get(`/docs/${docId}/messages`, { params });
      const msgs: ChatMessage[] = data.data ?? [];
      const reversedMsgs = msgs.reverse(); // Convert from newest-first to chronological

      set((s) => ({
        messages: reset ? reversedMsgs : [...reversedMsgs, ...s.messages],
        hasMore: data.pagination? data.pagination.hasMore : msgs.length === 30,
        cursor: reversedMsgs[0]?.createdAt ?? s.cursor,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),
}));
