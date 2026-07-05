import { PenTool } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Annotate — TaskCanvas" };

export default function AnnotatePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg border border-border bg-surface text-accent">
        <PenTool className="size-6" />
      </span>
      <h1 className="text-lg font-semibold tracking-tight">The canvas lands in Phase 4</h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        Image uploads, stack scrolling, and polygon drawing arrive after the board. You are
        signed in and the app shell is live.
      </p>
    </div>
  );
}
