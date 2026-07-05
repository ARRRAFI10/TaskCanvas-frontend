# TaskCanvas — Frontend

Next.js 16 (TypeScript) frontend for **TaskCanvas**: a 2-in-1 task management
(Kanban) and image annotation app. The Django API lives in a separate repository
(`taskcanvas-backend`).

> Full documentation (villains faced, versions, deployment guide) lands with the
> final phase. Quick start for now:

```bash
npm install
cp .env.example .env.local   # points at the local Django API
npm run dev
```

Open http://localhost:3000 — requires the backend running at
http://127.0.0.1:8000 for API-backed pages (from Phase 2 onward).
