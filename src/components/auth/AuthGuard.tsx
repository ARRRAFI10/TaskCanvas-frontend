"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";

import { Spinner } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/stores/authStore";

/**
 * Client-side source of truth for auth. The proxy's cookie check only prevents
 * a flash of protected UI; this guard owns the real token state.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const access = useAuthStore((state) => state.access);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (hasHydrated && !access) router.replace("/login");
  }, [hasHydrated, access, router]);

  if (!hasHydrated || !access) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-6 text-accent" />
      </div>
    );
  }
  return children;
}
