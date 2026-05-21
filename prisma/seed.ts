import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

type VaccineSeed = {
  code: string;
  name: string;
  doseLabel: string;
  recommendedAgeMonths: number;
};

type MilestoneSeed = {
  code: string;
  domain: 'MOTOR' | 'SPEECH' | 'SOCIAL' | 'THINKING';
  label: string;
  typicalAgeMonths: number;
  hintText: string;
};

type GameSeed = {
  code: string;
  name: string;
  sub: string;
  ageMin: number;
  ageMax: number;
  isPro: boolean;
  illustrationKind: string;
};

function readJson<T>(file: string): T[] {
  const full = path.join(__dirname, 'seed-data', file);
  return JSON.parse(fs.readFileSync(full, 'utf8')) as T[];
}

async function main(): Promise<void> {
  const vaccines = readJson<VaccineSeed>('vaccines.json');
  for (const v of vaccines) {
    await prisma.vaccineCatalog.upsert({
      where: { code: v.code },
      create: v,
      update: v,
    });
  }

  const milestones = readJson<MilestoneSeed>('milestones.json');
  for (const m of milestones) {
    await prisma.milestoneCatalog.upsert({
      where: { code: m.code },
      create: m,
      update: m,
    });
  }

  const games = readJson<GameSeed>('games.json');
  for (const g of games) {
    await prisma.gameCatalog.upsert({
      where: { code: g.code },
      create: g,
      update: g,
    });
  }

  console.log(
    `Seeded ${vaccines.length} vaccines, ${milestones.length} milestones, ${games.length} games`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
