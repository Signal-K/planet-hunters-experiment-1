# kanban-go

Landnám sprint board — Go backend + vanilla JS PWA.

## Running locally

```bash
go run .
# Open http://localhost:4444
```

Default port is `4444`. Without Supabase env vars, tasks are stored in `kanban-data/tasks.json` (created automatically).

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4444` | HTTP listen port |
| `KANBAN_DATA_DIR` | `kanban-data` | Directory for `tasks.json` |
| `KANBAN_ATTACHMENTS_DIR` | `kanban-data/attachments` | Directory for uploaded files |
| `KANBAN_PUBLIC_DIR` | `public` | Static files directory |
| `SUPABASE_URL` | — | Supabase project URL (enables cloud sync) |
| `SUPABASE_SERVICE_KEY` | — | Supabase service role key |
| `SUPABASE_ANON_KEY` | — | Supabase anon key (fallback if SERVICE_KEY not set) |
| `VERCEL` | — | Set to `1` by Vercel; forces Supabase-only mode |

## Store modes

- **Local JSON only** (no Supabase vars): reads/writes `kanban-data/tasks.json`
- **Chain store** (Supabase vars present, not on Vercel): reads from local JSON (fast), writes to both, syncs from Supabase on startup and on `POST /api/sync`
- **Supabase only** (on Vercel): reads/writes Supabase directly

## Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Set required env vars in Vercel dashboard or via CLI:
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY

# Deploy
vercel --prod
```

Static files in `public/` are served by Vercel's CDN. API routes are handled by the Go serverless function at `api/index.go`.

## Supabase SQL setup

Run this once in the Supabase SQL editor:

```sql
CREATE TABLE kanban_tasks (
  id           TEXT        PRIMARY KEY,
  project      TEXT        NOT NULL DEFAULT '',
  project_name TEXT        NOT NULL DEFAULT '',
  title        TEXT        NOT NULL DEFAULT '',
  status       TEXT        NOT NULL DEFAULT 'todo',
  priority     TEXT        NOT NULL DEFAULT 'medium',
  labels       TEXT[]      NOT NULL DEFAULT '{}',
  assignee     TEXT        NOT NULL DEFAULT '',
  description  TEXT        NOT NULL DEFAULT '',
  notes        TEXT        NOT NULL DEFAULT '',
  plan         TEXT        NOT NULL DEFAULT '',
  ac           JSONB       NOT NULL DEFAULT '[]',
  attachments  TEXT[]      NOT NULL DEFAULT '{}',
  time_spent   FLOAT8      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_all" ON kanban_tasks FOR ALL USING (true) WITH CHECK (true);
```

## Docker

```bash
# Build and run
docker compose up --build

# Tasks persist in a named volume between restarts.
# To seed initial tasks, copy kanban-data/tasks.json into the volume:
docker compose cp kanban-data/tasks.json kanban:/app/kanban-data/tasks.json
```

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tasks` | List all tasks (sorted by status) |
| `GET` | `/api/tasks/{project}/{id}` | Get single task |
| `POST` | `/api/tasks/{project}` | Create task |
| `PUT` | `/api/tasks/{project}/{id}` | Patch task fields |
| `GET` | `/api/projects` | List projects |
| `POST` | `/api/sync` | Pull Supabase → local JSON |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/tasks/{project}/{id}/attachments` | Upload file attachment |
| `GET` | `/api/attachments/{taskId}/{filename}` | Serve attachment |
