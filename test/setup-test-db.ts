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
  execSync('npx prisma db seed', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_TEST! },
    stdio: 'inherit',
  });
  migrated = true;
}

export async function truncateAll(prisma: PrismaClient): Promise<void> {
  // Order matters: leaf tables first to avoid FK violations.
  await prisma.currentSession.deleteMany();
  await prisma.firstMoment.deleteMany();
  await prisma.milestoneCompletion.deleteMany();
  await prisma.vaccineDose.deleteMany();
  await prisma.weightHeight.deleteMany();
  await prisma.diaperChange.deleteMany();
  await prisma.sleep.deleteMany();
  await prisma.feeding.deleteMany();
  await prisma.child.deleteMany();
  await prisma.familyInvite.deleteMany();
  await prisma.familyMembership.deleteMany();
  await prisma.family.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}
