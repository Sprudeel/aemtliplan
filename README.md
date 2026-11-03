# Ämtliplan

Chore rotation (Ämtli) for scout camps. Nuxt 4 + Nuxt UI (Dashboard Template), Nitro API,
better-auth, Prisma, Postgres. UI in German, French and Italian.

Features: multi-camp plans with admin/viewer roles, planner with drag & drop, daily
automatic rotation with history and undo, MiData login and camp import, and a public
wall view with a wall designer (free placement per screen size, card styles,
backgrounds, widgets).

## Setup

Needs Node 24 (`.nvmrc`; with nvm: `nvm use`) and Docker.

```bash
cp .env.example .env          # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm install
npm run db:up                 # Postgres in Docker on port 5433 (dev + _test DB)
npm run db:deploy             # apply migrations
npm run db:seed               # admin@example.com / viewer@example.com, password "password"
npm run dev
```

## Tests

`.env.test` must point `DATABASE_URL` at a database whose name ends in `_test`
(the tests refuse to run otherwise). Copy `.env.example`, use `aemtliplan_test`,
and set `AUTH_RATE_LIMIT="off"` and `ROTATION_SCHEDULER="off"`.

```bash
npm test                       # unit + component + API tests (API tests build and start the real server)
npm run test:unit              # fast, no build
npm run test:nuxt              # Vue components in a Nuxt environment
npx playwright install chromium   # once
npm run test:e2e               # browser end-to-end tests (Playwright)
npm run typecheck
```

## API

All routes live in `server/api/`. Overview:

| Area | Routes |
| --- | --- |
| Accounts, plans, members, invitations | `/api/auth/**` (better-auth) |
| Plan + settings | `GET /api/plans/:planId`, `PATCH …/settings`, `PUT/DELETE …/background` |
| Groups | `GET/POST …/groups`, `PATCH/DELETE …/groups/:groupId`, `POST …/groups/:groupId/members/:memberId/invite` |
| Ämtli | `GET/POST …/jobs`, `PATCH/DELETE …/jobs/:jobId`, `PUT …/jobs/order` |
| Assignments | `GET …/assignments`, `PUT/DELETE …/assignments/:jobId` |
| Rotations | `GET/POST …/rotations`, `GET …/rotations/preview`, `POST …/rotations/:id/undo` |
| Me | `GET …/me` |
| Public view | `GET /api/public/:slug`, `GET /api/public/:slug/events` (SSE) |
| MiData | `GET /api/midata/camps`, `POST /api/midata/camps/:eventId/import` |

Errors always look like `{ statusCode, statusMessage, data: { code, issues? } }`.

## Database

- Schema: `prisma/schema.prisma`; migrations are tracked in `prisma/migrations`.
- New migration: `npm run db:migrate -- --name <change>`.
- The old SQLite migrations were moved to `prisma/migrations-sqlite-legacy/` (git-ignored, local only).
