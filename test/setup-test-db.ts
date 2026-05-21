import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

let migrated = false;

export function bootstrapTestDatabaseUrl(): void {
  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl) {
    throw new Error('DATABASE_URL_TEST is not set');
  }
  process.env.DATABASE_URL = testUrl;
}

export async function applyMigrationsOnce(): Promise<void> {
  if (migrated) return;
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST! },
    stdio: 'inherit',
  });
  migrated = true;
}

export async function truncateAll(prisma: PrismaClient): Promise<void> {
  // Order matters because of FK: refresh_tokens.user_id -> users.id (Cascade
  // would also handle this, but explicit is clearer.)
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}
