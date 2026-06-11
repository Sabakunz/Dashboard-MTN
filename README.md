# Dashboard-MTN

CNC machine maintenance monitoring dashboard — Express REST API,
PostgreSQL (via Prisma), and a static HTML/JS frontend. Deployable as a
single Express app (local/Render-style hosts) or as Netlify (static
frontend + serverless function for the API).

## Features

- KPI overview: breakdowns, downtime, availability, performance, quality, OEE, MTBF, MTTR
- Per-machine status table with live availability/breakdown stats
- Breakdown timeline + Pareto analysis of failure causes
- Downtime-per-day chart (last 7 days)
- Auto-refreshing dashboard (polls the API every 30s)
- CSV import for bulk-loading maintenance/breakdown records

## Project structure

```
index.html              # frontend (static HTML/JS)
src/app.js              # Express app (API + static file serving)
src/server.js           # local dev entrypoint (runs src/app.js)
src/routes/api.js       # REST API routes
src/db.js               # Prisma client
netlify/functions/api.js# Netlify Function wrapper around src/app.js
netlify.toml            # Netlify build/redirect config
prisma/schema.prisma
prisma/migrations/       # SQL migrations
prisma/seed.js           # sample data
```

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file (see `.env.example`) pointing `DATABASE_URL` at a Postgres database.
3. Apply migrations and seed sample data:
   ```bash
   npx prisma migrate deploy
   npm run seed
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open http://localhost:3001 — the dashboard and API are served from the same port.

## Deploying online for free (Netlify + Neon)

This repo includes a `netlify.toml`: the frontend (`index.html`) is served as a
static site, and the API (`src/routes/api.js`) runs as a Netlify Function
(`netlify/functions/api.js`), reachable at `/api/*` via a redirect.

1. **Create a free Postgres database on [Neon](https://neon.tech)**
   - Sign up, create a project, and copy the connection string
     (looks like `postgresql://user:pass@ep-xxxx.neon.tech/dbname?sslmode=require`).
   - Use the **pooled** connection string (recommended for serverless functions).

2. **Create a site on [Netlify](https://netlify.com)**
   - Add new site → Import an existing project → connect this GitHub repo.
   - Netlify will detect `netlify.toml` automatically:
     - Build command: `npm install && npm run build`
     - Publish directory: `.`
     - Functions directory: `netlify/functions`
   - In Site configuration → Environment variables, add `DATABASE_URL`
     = your Neon connection string.

3. **Apply migrations and seed the database**
   - The build runs `prisma migrate deploy` automatically (via `npm run build`),
     so the schema stays in sync on every deploy.
   - To seed sample data, run once locally against the same `DATABASE_URL`:
     ```bash
     DATABASE_URL="<your Neon connection string>" npm run seed
     ```

4. Netlify will give you a public URL (e.g. `https://your-site.netlify.app`)
   serving both the dashboard and the `/api/*` endpoints — open it to test live.

### Keeping the database in sync

If the dashboard shows no data ("Demo mode" / empty tables), the database is
likely empty or migrations haven't been applied:

```bash
# Point at your deployed database and apply the schema
DATABASE_URL="<your Neon connection string>" npx prisma migrate deploy

# Load sample data
DATABASE_URL="<your Neon connection string>" npm run seed
```

## Importing maintenance data

Use the "Import CSV" sidebar button to upload a `.csv` file with these columns:

```
machine_name, machine_type, breakdown_date, start_time, end_time, failure_cause, category, technician, notes
```

New machines are created automatically if they don't already exist.

## Next steps / expanding data

- Add more machines/fields by editing `prisma/schema.prisma` and running
  `npx prisma migrate dev` to create a new migration.
- Track production counts per machine to compute real Performance/Quality
  (currently defaulted per machine in the `Machine` table).
- Add authentication if this will hold real factory data.
