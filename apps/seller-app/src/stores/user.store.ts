/**
 * Cross-component user store. Hydrated by `useSyncUser` once authenticated.
 */
import { create } from "zustand";
import type { User } from "@/src/types/user";

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
  patchUser: (patch: Partial<User>) => void;
  clear: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  patchUser: (patch) =>
    set((s) => ({ user: s.user ? { ...s.user, ...patch } : s.user })),
  clear: () => set({ user: null }),
}));
