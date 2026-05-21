# BabyGrow Backend

NestJS + Prisma + Postgres API server for the BabyGrow app.

## Requirements

- Node.js >= 20.11 (you have it if `node -v` is 20.11.x or newer)
- Postgres 14+ (Homebrew install on macOS: `brew install postgresql@16 && brew services start postgresql@16`)

## First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Create the dev database (one-time)
createdb babygrow_dev

# 3. Copy env example and edit the USERNAME placeholder to your macOS username
cp .env.example .env
# Open .env and replace USERNAME with the output of `whoami`

# 4. Run the initial Prisma migration (creates the empty _prisma_migrations table)
npm run prisma:migrate -- --name init
```

## Daily dev loop

```bash
npm run start:dev   # boots on http://localhost:3000 with watch mode
```

Smoke check:

```bash
curl http://localhost:3000/health
# → {"status":"ok","db":"ok","uptime":1.23,"timestamp":"2026-05-21T..."}
```

## Test database

The e2e tests use a separate `babygrow_test` database. One-time setup:

```bash
createdb babygrow_test
```

The `DATABASE_URL_TEST` in `.env` points at it. Tests apply pending migrations on boot and truncate the `User` + `RefreshToken` tables before each test.

## Scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | Boot with file watch |
| `npm run build` | Compile to `dist/` |
| `npm run lint` | ESLint with autofix |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests (requires DB running) |
| `npm run prisma:migrate` | Apply pending migrations (dev) |
| `npm run prisma:studio` | Open Prisma Studio in browser |

## Environment variables

| Var | Required | Example |
|---|---|---|
| `NODE_ENV` | yes | `development` |
| `PORT` | yes | `3000` |
| `DATABASE_URL` | yes | `postgresql://<user>@localhost:5432/babygrow_dev?schema=public` |
| `CORS_ORIGINS` | yes | `http://localhost:3000,http://localhost:8081` (comma-separated) |

The app fails to boot with a clear error if any of these are missing or invalid (Joi validation in `src/config/env.validation.ts`).
