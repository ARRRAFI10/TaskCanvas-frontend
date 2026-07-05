export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6">
      <header className="flex flex-col items-center gap-4 text-center">
        <span className="rounded-full border border-border bg-surface px-4 py-1 text-xs font-medium tracking-widest text-muted uppercase">
          Phase 0 — Scaffolding
        </span>
        <h1 className="text-5xl font-semibold tracking-tight">
          Task<span className="text-accent">Canvas</span>
        </h1>
        <p className="max-w-md text-lg leading-relaxed text-muted">
          Plan your day on a Kanban board. Annotate images like a radiologist. One app, one
          canvas.
        </p>
      </header>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-1 font-medium text-foreground">Tasks</h2>
          <p className="text-sm leading-relaxed text-muted">
            Date-driven Kanban — drag, drop, prioritize, tag.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-1 font-medium text-foreground">Annotate</h2>
          <p className="text-sm leading-relaxed text-muted">
            Upload images, stack-scroll, draw polygons, persist.
          </p>
        </div>
      </div>

      <p className="text-xs text-faint">Login, board, and canvas arrive in the next phases.</p>
    </div>
  );
}
