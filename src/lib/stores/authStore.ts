import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { LoginResponse, User } from "@/lib/types";

/**
 * Lightweight cookie flag mirroring the session so the server-side proxy
 * (src/proxy.ts) can redirect before any page renders. The tokens themselves
 * never leave localStorage.
 */
function setAuthCookie(present: boolean) {
  if (typeof document === "undefined") return;
  document.cookie = present
    ? "tc_auth=1; path=/; max-age=604800; samesite=lax"
    : "tc_auth=; path=/; max-age=0";
}

interface AuthState {
  user: User | null;
  access: string | null;
  refresh: string | null;
  hasHydrated: boolean;
  setSession: (session: LoginResponse) => void;
  setAccess: (access: string) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      access: null,
      refresh: null,
      hasHydrated: false,
      setSession: ({ user, access, refresh }) => {
        setAuthCookie(true);
        set({ user, access, refresh });
      },
      setAccess: (access) => set({ access }),
      logout: () => {
        setAuthCookie(false);
        set({ user: null, access: null, refresh: null });
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: "taskcanvas-auth",
      partialize: ({ user, access, refresh }) => ({ user, access, refresh }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
