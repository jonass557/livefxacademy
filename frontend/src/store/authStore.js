import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from '../lib/safeStorage';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      updateUser: (partialUser) => set({ user: { ...get().user, ...partialUser } }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'livefx-auth',
      storage: createJSONStorage(() => safeStorage),
    }
  )
);
