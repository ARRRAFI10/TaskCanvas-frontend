# Deploying taskcanvas-frontend to Vercel

The backend should already be live on PythonAnywhere (see the backend repo's
DEPLOYMENT.md) — you'll need its URL here.

## 1. Push to GitHub

The repo must be on GitHub (public or private — Vercel reads both).

## 2. Import into Vercel

1. Sign in at https://vercel.com (the free Hobby plan is enough).
2. **Add New… → Project** → import `taskcanvas-frontend`.
3. Vercel auto-detects Next.js — leave build settings untouched.

## 3. Environment variable

Under **Environment Variables**, add (for all environments):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<username>.pythonanywhere.com` |

No trailing slash. This is baked in at build time — changing it later requires a
redeploy.

## 4. Deploy

Click **Deploy**. Vercel builds and hands you a URL like
`https://taskcanvas-frontend-<hash>.vercel.app` plus a stable
`https://<project>.vercel.app` domain.

## 5. Close the CORS loop (important!)

The backend only accepts browser requests from origins it knows. On PythonAnywhere:

1. Edit `~/taskcanvas-backend/.env` → set
   `CORS_ALLOWED_ORIGINS=https://<project>.vercel.app`
   (comma-separate if you want preview URLs too).
2. **Web tab → Reload**.

## 6. Smoke test the live app

1. Open `https://<project>.vercel.app` → you should be redirected to `/login`.
2. Click **Use demo credentials** → Sign in.
3. `/tasks`: create a task, drag it between columns, reload — everything persists.
4. `/annotate`: upload an image, draw a polygon and a box, Ctrl+Z, reload at a
   different window size — shapes land pixel-perfect (normalized coordinates).
5. Log out → protected routes bounce back to `/login`.

## Updating

Every `git push` to the default branch triggers an automatic Vercel redeploy.
