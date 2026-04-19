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
      if (!reset && get().cursor) params.before = get().cursor!;

      const { data } = await api.get(`/docs/${docId}/messages`, { params });
      const msgs: ChatMessage[] = data.data ?? [];

      set((s) => ({
        messages: reset ? msgs : [...msgs, ...s.messages],
        hasMore: msgs.length === 30,
        cursor: msgs[0]?.createdAt ?? s.cursor,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),
}));
