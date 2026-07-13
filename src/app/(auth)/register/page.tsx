import { KanbanSquare, PenTool, ScanLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Create account — TaskCanvas" };

const features = [
  { icon: KanbanSquare, text: "Plan every day on a drag-and-drop Kanban board" },
  { icon: PenTool, text: "Draw polygon annotations directly on your images" },
  { icon: ScanLine, text: "Stack-scroll image series like a radiology viewer" },
];

export default function RegisterPage() {
  return (
    <div className="flex min-h-dvh">
      {/* Brand panel */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-border bg-surface p-10 lg:flex">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.08),transparent_55%),linear-gradient(to_right,rgba(29,42,55,0.4)_1px,transparent_1px),linear-gradient(to_bottom,rgba(29,42,55,0.4)_1px,transparent_1px)] bg-[size:100%_100%,32px_32px,32px_32px]"
        />
        <p className="relative z-10 text-lg font-semibold tracking-tight">
          Task<span className="text-accent">Canvas</span>
        </p>
        <div className="relative z-10 flex flex-col gap-8">
          <h1 className="max-w-md text-3xl leading-snug font-semibold tracking-tight">
            One canvas for your tasks <span className="text-accent">and</span> your images.
          </h1>
          <ul className="flex flex-col gap-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-muted">
                <span className="flex size-8 items-center justify-center rounded-md border border-border bg-surface-raised text-accent">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-faint">
          Built with Next.js, Django, and an unreasonable attention to detail.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col gap-1.5">
            <p className="text-lg font-semibold tracking-tight lg:hidden">
              Task<span className="text-accent">Canvas</span>
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
            <p className="text-sm text-muted">
              Your own board and image library, empty and ready.
            </p>
          </div>
          <SignupForm />
          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
