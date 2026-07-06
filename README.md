# TaskCanvas — Frontend

Next.js 16 (TypeScript) frontend for **TaskCanvas**: a 2-in-1 task management (Kanban)
and image annotation app, built for the VaiRadiology fullstack engineering task.
The Django API lives in its own repository: **taskcanvas-backend**.

| | |
|---|---|
| Live app | `https://<project>.vercel.app` *(link added after deploy)* |
| Backend repo | `https://github.com/<you>/taskcanvas-backend` |
| Live API | `https://<username>.pythonanywhere.com` |
| Demo login | `demo@taskcanvas.app` / `TaskCanvas#2026` |

## What's inside

- **`/tasks`** — a date-driven Kanban board: reusable `<DateSelector/>` (week strip +
  hand-built month calendar), three columns with @dnd-kit drag-and-drop, optimistic
  moves with rollback, task modals with zod validation and chip-style tags.
- **`/annotate`** — a PACS-inspired annotation workspace: wheel **stack-scrolling**
  through the image series, Ctrl+wheel zoom-to-cursor, four shape tools (polygon, box,
  polyline, point), vertex insert/remove, **undo/redo**, per-shape metrics (area/length),
  visibility toggles, brightness/contrast/saturation/invert/grayscale filters, and
  JSON export. Shapes persist as normalized 0–1 coordinates.
- **Auth** — JWT login with single-flight refresh rotation; a lightweight cookie flag
  lets Next's server-side proxy redirect before protected pages ever render.
- **Stack** — App Router, Tailwind v4 design tokens (dark clinical theme), Zustand for
  client state, TanStack Query for server state, react-konva for the canvas.

## Villains I faced (and how I beat them)

1. **The Next.js 16 plot twist.** `create-next-app` shipped Next 16 — newer than most
   tutorials — and the scaffold itself warned that conventions had changed. Reading the
   docs bundled inside `node_modules/next/dist/docs` revealed the big one: `middleware.ts`
   is now `proxy.ts`. Trusting shipped documentation over training-data habits saved
   hours of silent auth-redirect failures.

2. **Konva vs. the server.** Konva touches `window` at import time, so any server render
   of the canvas crashes the build. The canvas is loaded with
   `dynamic(() => import(...), { ssr: false })` and mounts only in the browser — planned
   from day one, so it never actually bit.

3. **The stricter lint boss fight.** Next 16 ships a new `react-hooks/set-state-in-effect`
   rule that bans the classic `useEffect(() => setMounted(true), [])` portal pattern.
   The idiomatic replacement — `useSyncExternalStore` returning `false` on the server and
   `true` on the client — is cleaner anyway.

4. **JWT in localStorage vs. server-side route guards.** The proxy runs on the server
   and cannot read localStorage, so "redirect before render" seemed impossible without
   moving tokens into cookies. Solution: the auth store mirrors *session presence* (never
   tokens) into a `tc_auth` cookie; the proxy does optimistic redirects while the client
   guard remains the source of truth.

5. **Optimistic drag-and-drop that doesn't snap back.** Dropping a card felt broken
   whenever the server's reordering disagreed with the cache. The cure was `applyMove` —
   a pure client-side mirror of the backend's dense-renumbering semantics — so the
   optimistic state and the refetched state are always identical.

6. **The double-click that drew two extra vertices.** Finishing a polygon by
   double-clicking first registers two single clicks. The close handler trims the
   duplicate vertex before saving — a tiny fix found only by drawing a lot of polygons.

7. **Undo that undoes itself.** Recording history inside the mutation hooks meant that
   *replaying* an entry during undo recorded a brand-new entry — an infinite hall of
   mirrors. A `restoring` flag suspends recording while the executor replays operations
   through the same mutations.

## Versions & running locally

- **Node:** 24.x (LTS 20+ works) · **npm:** 11.x
- **Next.js:** 16.2 · **React:** 19.2 · **TypeScript:** 5 (strict)

The app expects the Django API running locally — see the backend README
(migrate + `seed_demo` + `runserver`) first.

```bash
git clone https://github.com/<you>/taskcanvas-frontend.git
cd taskcanvas-frontend

npm install
cp .env.example .env.local     # NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

npm run dev                    # http://localhost:3000
```

Sign in with the seeded demo account — the login page has a one-click
**"Use demo credentials"** autofill.

**Quality gates:**

```bash
npm run lint        # ESLint (zero warnings policy)
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

## Deployment

Click-by-click Vercel instructions live in [DEPLOYMENT.md](DEPLOYMENT.md).
