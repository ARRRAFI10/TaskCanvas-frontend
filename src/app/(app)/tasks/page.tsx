import { KanbanSquare } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tasks — TaskCanvas" };

export default function TasksPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-surface text-accent">
        <KanbanSquare className="size-6" />
      </span>
      <h1 className="text-lg font-semibold tracking-tight">The board lands in Phase 3</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        Date picker, three columns, drag-and-drop, and task modals arrive next. You are
        signed in and the app shell is live.
      </p>
    </div>
  );
}
