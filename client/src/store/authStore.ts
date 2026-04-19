import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        set({
          user: data.data.user,
          token: data.data.accessToken,
          refreshToken: data.data.refreshToken,
          isAuthenticated: true,
        });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.data.accessToken}`;
      },

      register: async (name, email, password) => {
        const { data } = await api.post('/auth/register', { name, email, password });
        set({
          user: data.data.user,
          token: data.data.accessToken,
          refreshToken: data.data.refreshToken,
          isAuthenticated: true,
        });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.data.accessToken}`;
      },

      logout: () => {
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
      },

      refreshAccessToken: async () => {
        const currentRefreshToken = get().refreshToken;
        if (!currentRefreshToken) {
          get().logout();
          return;
        }

        try {
          const { data } = await api.post('/auth/refresh', { refreshToken: currentRefreshToken });
          set({ token: data.data.accessToken });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.data.accessToken}`;
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: 'collab-auth',
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        refreshToken: s.refreshToken,
        isAuthenticated: s.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
        }
      },
    }
  )
);
