# Dashboard-MTN

CNC machine maintenance monitoring dashboard — Express REST API, PostgreSQL
(via Prisma, hosted on Supabase), and a React (Vite) frontend with admin
login. Deployable as a single Express app (local/VPS-style hosts) or as
Netlify (static frontend + serverless function for the API).

## Features

- Admin login (JWT) — the dashboard and API are only reachable when logged in
- KPI overview: breakdowns, downtime, availability, performance, quality, OEE, MTBF, MTTR
- Per-machine status table (Cluster/Line) with live availability/breakdown stats
- Breakdown timeline + Pareto analysis of failure causes and per-machine frequency
- Downtime trend chart (bar chart) for Harian/Mingguan/Bulanan, aligned to
  calendar day/week(Mon-Sun)/year(Jan-Dec)
- Repair Machine Order (RMO) workflow: open with PIC GH, close with PIC MTN,
  resolution/action, duration computed from start/end date+time
- Auto-refreshing dashboard (polls the API every 30s)
- CSV import for bulk-loading maintenance/breakdown records

## Project structure

```
web/                     # React + Vite frontend
  src/
    App.jsx, AuthContext.jsx, AppContext.jsx, UIContext.jsx
    pages/                # Login, Dashboard, Machines, Maintenance, Reports
    components/           # Topbar, Sidebar, modals, charts, etc.
  vite.config.js
src/app.js               # Express app (API + serves web/dist)
src/server.js            # local dev entrypoint (runs src/app.js)
src/routes/api.js        # REST API routes (all but /health and /login require login)
src/lib/auth.js           # JWT sign/verify middleware
src/db.js                # Prisma client
scripts/create-admin.js  # provision/reset the admin account
netlify/functions/api.js # Netlify Function wrapper around the API router
netlify.toml             # Netlify build/redirect config
prisma/schema.prisma
prisma/migrations/        # SQL migrations
prisma/seed.js            # sample data (local dev only)
```

## Local development

1. Install dependencies (root + frontend):
   ```bash
   npm install
   npm install --prefix web
   ```
2. Create a `.env` file (see `.env.example`) with `DATABASE_URL`, `DIRECT_URL`,
   and `JWT_SECRET` pointing at your Postgres database.
3. Apply migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. Create the admin account:
   ```bash
   npm run create-admin -- <username> <password>
   ```
5. Build the frontend and start the server:
   ```bash
   npm run build --prefix web
   npm start
   ```
6. Open http://localhost:3001 — log in, the dashboard and API are served from the same port.

For frontend-only iteration with hot reload, run `npm run dev --prefix web`
instead (it proxies `/api` to `http://localhost:3001`, so the backend must
also be running).

## Deploying online (Netlify + Supabase)

1. **Database**: create a free Postgres project on [Supabase](https://supabase.com).
   Get two connection strings from the project's "Connect" dialog:
   - **Transaction pooler** (port 6543) → `DATABASE_URL`
   - **Session pooler or direct** (port 5432) → `DIRECT_URL`

   Append `?pgbouncer=true&connection_limit=5` to `DATABASE_URL`. **Don't use
   `connection_limit=1`** — the dashboard fires up to 6 API requests in
   parallel on every load/refresh, and a single pooled connection isn't
   enough to serve all of them, causing some requests to hang.

2. **Netlify site**: Import this repo. `netlify.toml` already configures:
   - Build command: `npm install && npm run build && npm install --prefix web && npm run build --prefix web`
   - Publish directory: `web/dist`
   - Functions directory: `netlify/functions`

   In Site configuration → Environment variables, add `DATABASE_URL`,
   `DIRECT_URL`, and `JWT_SECRET` (same values as your local `.env`).

3. **Migrate + create the admin** against the Supabase database (run locally,
   pointed at the same `DATABASE_URL`/`DIRECT_URL` Netlify uses):
   ```bash
   npx prisma migrate deploy
   npm run create-admin -- <username> <password>
   ```

4. Trigger a deploy. Netlify gives you a public URL — open it, log in with
   the admin account you created.

### Troubleshooting

- **`/api/health`** (no login required) — open `https://<site>/api/health`.
  `{"ok":true,"machines":N}` means the function can reach Postgres.
- **Login works but the dashboard never finishes "Updating…"** — almost
  always `connection_limit` set too low on `DATABASE_URL` (see above).
- **POST/PATCH requests fail with no error** — `express.json()` doesn't parse
  the body correctly under `serverless-http` because the mock request object
  sets `complete: true` upfront, tricking `body-parser`'s "already read"
  check. `netlify/functions/api.js` works around this with a manual
  `JSON.parse` of the raw body — don't replace it with bare `express.json()`.

## Importing maintenance data

Use the "Import CSV" sidebar button to upload a `.csv` file with these columns:

```
machine_name, machine_cluster, machine_line, breakdown_date, start_time, end_time, failure_cause, category, technician, notes
```

New machines are created automatically if they don't already exist.

## Next steps / expanding data

- Add more machines/fields by editing `prisma/schema.prisma` and running
  `npx prisma migrate dev` to create a new migration.
- Track production counts per machine to compute real Performance/Quality
  (currently defaulted per machine in the `Machine` table).
- Support multiple admin accounts (the `Admin` table already supports more
  than one row; there's just no UI yet to add a second one).
