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

## Generating `JWT_ACCESS_SECRET`

```bash
openssl rand -base64 64 | tr -d '\n='
```

Paste the output into your `.env` as `JWT_ACCESS_SECRET=...`. Must be at least 32 characters (the Joi schema enforces this).

## Manual smoke (curl)

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"supersecret","displayName":"Test"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"supersecret"}'

# Capture the tokens from the login response:
ACCESS=...   # from login response
REFRESH=...  # from login response

# Use the access token to call /me
curl http://localhost:3000/me -H "Authorization: Bearer $ACCESS"

# Refresh
curl -X POST http://localhost:3000/auth/refresh \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}"

# Logout
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer $ACCESS" \
  -H 'Content-Type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}"
```

## Domain endpoints

All endpoints below require `Authorization: Bearer <accessToken>` from `/auth/login`. Routes prefixed with `/families` or accepting `:familyId` / `:childId` enforce membership via `FamilyPermsGuard` (non-membership returns 404, not 403).

| Resource | Methods | Notes |
|---|---|---|
| `/families` | POST, GET | Caller-scoped |
| `/families/:familyId` | GET, PATCH, DELETE | Tiered: `read`/`primary` |
| `/families/:familyId/invites` | POST, GET | Primary creates; readable by any member |
| `/families/:familyId/invites/:id` | DELETE | Primary only |
| `/families/join` | POST | Body: `{code}` |
| `/families/:familyId/members` | GET | Read tier |
| `/families/:familyId/members/:userId` | PATCH, DELETE | Primary only; cannot remove last primary |
| `/families/:familyId/children` | POST, GET | Read or `photos` if `avatarUrl` set |
| `/children/:childId` | GET, PATCH, DELETE | GET includes `todaySummary` |
| `/children/:childId/feedings` | POST, GET (?from&to) | Live session enforced |
| `/children/:childId/feedings/current` | GET | Live row or null |
| `/feedings/:id` | PATCH, DELETE | Setting `endedAt` clears CurrentSession |
| `/children/:childId/sleeps` etc. | Same as feedings | |
| `/children/:childId/diapers` | POST, GET (?from&to) | No live session |
| `/children/:childId/measurements` | POST, GET (?from&to) | No live session |
| `/catalog/vaccines` | GET | Seeded |
| `/children/:childId/vaccines` | POST, GET | Dose tracking |
| `/vaccines/:id` | PATCH, DELETE | |
| `/catalog/milestones` | GET | Seeded |
| `/children/:childId/milestones` | POST (upsert), GET | |
| `/milestones/:id` | PATCH, DELETE | |
| `/children/:childId/firsts` | POST, GET (?from&to) | `photoUrl` requires `photos` tier |
| `/firsts/:id` | PATCH, DELETE | |
| `/catalog/games` | GET (?ageMin&ageMax) | Read-only |
| `/uploads` | POST (multipart) | Returns `{url}` |
| `/uploads/<filename>` | GET (static) | See warning below |

## Uploads (dev only — NOT production-safe)

The `/uploads` endpoint accepts multipart `image/*` files up to 5 MB and stores them on local disk under `BabyGrowBackend/uploads/`. The files are served back at `/uploads/<uuid>.<ext>`.

**There is no per-file access control.** Any authenticated user (with any URL) can read any uploaded file. The URLs are unguessable UUIDs, which is "security by obscurity" — acceptable for local dev, **NOT acceptable for production**.

Before deploying publicly, replace with S3 presigned URLs (or equivalent) and enforce per-file ACLs. This is intentionally out of scope of the current backend.
