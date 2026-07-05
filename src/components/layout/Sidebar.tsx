"use client";

import { KanbanSquare, LogOut, PenTool } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuthStore } from "@/lib/stores/authStore";
import { cn } from "@/lib/utils";

const links = [
  { href: "/tasks", label: "Tasks", icon: KanbanSquare },
  { href: "/annotate", label: "Annotate", icon: PenTool },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const initial = (user?.first_name?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();

  return (
    <aside className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-4 py-2 md:h-dvh md:w-60 md:flex-col md:items-stretch md:justify-start md:border-r md:border-b-0 md:px-3 md:py-4">
      <Link href="/tasks" className="text-base font-semibold tracking-tight md:px-2 md:pb-6">
        Task<span className="text-accent">Canvas</span>
      </Link>

      <nav className="flex gap-1 md:flex-col">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-muted hover:bg-surface-raised hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 md:mt-auto md:border-t md:border-border md:pt-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
          {initial}
        </span>
        <div className="hidden min-w-0 flex-1 md:block">
          <p className="truncate text-xs font-medium text-foreground">
            {user ? `${user.first_name} ${user.last_name}`.trim() || user.email : ""}
          </p>
          <p className="truncate text-[11px] text-faint">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          title="Log out"
          className="cursor-pointer rounded-md p-2 text-muted transition-colors hover:bg-surface-raised hover:text-danger"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}
