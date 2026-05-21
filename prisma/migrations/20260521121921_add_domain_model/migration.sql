-- CreateEnum
CREATE TYPE "FamilyRole" AS ENUM ('PRIMARY_PARENT', 'COPARENT', 'GRANDMA', 'NANNY', 'OTHER');

-- CreateEnum
CREATE TYPE "FamilyPerms" AS ENUM ('FULL', 'TRACKER_PHOTOS', 'TRACKER_ONLY');

-- CreateEnum
CREATE TYPE "FeedingKind" AS ENUM ('BREAST', 'BOTTLE', 'SOLID');

-- CreateEnum
CREATE TYPE "SleepKind" AS ENUM ('NIGHT', 'NAP');

-- CreateEnum
CREATE TYPE "DiaperKind" AS ENUM ('WET', 'DIRTY', 'MIXED');

-- CreateEnum
CREATE TYPE "VaccineStatus" AS ENUM ('UPCOMING', 'DONE', 'MISSED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('DONE', 'WATCH', 'TODO');

-- CreateEnum
CREATE TYPE "SessionKind" AS ENUM ('FEEDING', 'SLEEP');

-- CreateEnum
CREATE TYPE "MilestoneDomain" AS ENUM ('MOTOR', 'SPEECH', 'SOCIAL', 'THINKING');

-- CreateTable
CREATE TABLE "Family" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMembership" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "FamilyRole" NOT NULL,
    "perms" "FamilyPerms" NOT NULL,
    "displayName" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyInvite" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "role" "FamilyRole" NOT NULL,
    "perms" "FamilyPerms" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedById" UUID,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "FamilyInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Child" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sex" TEXT,
    "birthday" DATE NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feeding" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "kind" "FeedingKind" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "leftMs" INTEGER,
    "rightMs" INTEGER,
    "volumeMl" INTEGER,
    "foodNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feeding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sleep" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "kind" "SleepKind" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sleep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaperChange" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "kind" "DiaperKind" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaperChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightHeight" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightHeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaccineDose" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "catalogVaccineId" UUID NOT NULL,
    "status" "VaccineStatus" NOT NULL,
    "givenAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaccineDose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneCompletion" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "catalogMilestoneId" UUID NOT NULL,
    "status" "MilestoneStatus" NOT NULL,
    "completedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilestoneCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirstMoment" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "photoUrl" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FirstMoment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrentSession" (
    "id" UUID NOT NULL,
    "childId" UUID NOT NULL,
    "kind" "SessionKind" NOT NULL,
    "sessionId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaccineCatalog" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "doseLabel" TEXT NOT NULL,
    "recommendedAgeMonths" INTEGER NOT NULL,

    CONSTRAINT "VaccineCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MilestoneCatalog" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "domain" "MilestoneDomain" NOT NULL,
    "label" TEXT NOT NULL,
    "typicalAgeMonths" INTEGER NOT NULL,
    "hintText" TEXT NOT NULL,

    CONSTRAINT "MilestoneCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameCatalog" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sub" TEXT NOT NULL,
    "ageMin" INTEGER NOT NULL,
    "ageMax" INTEGER NOT NULL,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "illustrationKind" TEXT NOT NULL,

    CONSTRAINT "GameCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyMembership_userId_idx" ON "FamilyMembership"("userId");

-- CreateIndex
CREATE INDEX "FamilyMembership_familyId_idx" ON "FamilyMembership"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMembership_familyId_userId_key" ON "FamilyMembership"("familyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyInvite_code_key" ON "FamilyInvite"("code");

-- CreateIndex
CREATE INDEX "FamilyInvite_familyId_idx" ON "FamilyInvite"("familyId");

-- CreateIndex
CREATE INDEX "Child_familyId_idx" ON "Child"("familyId");

-- CreateIndex
CREATE INDEX "Feeding_childId_startedAt_idx" ON "Feeding"("childId", "startedAt");

-- CreateIndex
CREATE INDEX "Sleep_childId_startedAt_idx" ON "Sleep"("childId", "startedAt");

-- CreateIndex
CREATE INDEX "DiaperChange_childId_at_idx" ON "DiaperChange"("childId", "at");

-- CreateIndex
CREATE INDEX "WeightHeight_childId_at_idx" ON "WeightHeight"("childId", "at");

-- CreateIndex
CREATE INDEX "VaccineDose_childId_idx" ON "VaccineDose"("childId");

-- CreateIndex
CREATE INDEX "MilestoneCompletion_childId_idx" ON "MilestoneCompletion"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneCompletion_childId_catalogMilestoneId_key" ON "MilestoneCompletion"("childId", "catalogMilestoneId");

-- CreateIndex
CREATE INDEX "FirstMoment_childId_date_idx" ON "FirstMoment"("childId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CurrentSession_childId_kind_key" ON "CurrentSession"("childId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "VaccineCatalog_code_key" ON "VaccineCatalog"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MilestoneCatalog_code_key" ON "MilestoneCatalog"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GameCatalog_code_key" ON "GameCatalog"("code");

-- AddForeignKey
ALTER TABLE "FamilyMembership" ADD CONSTRAINT "FamilyMembership_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMembership" ADD CONSTRAINT "FamilyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyInvite" ADD CONSTRAINT "FamilyInvite_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feeding" ADD CONSTRAINT "Feeding_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sleep" ADD CONSTRAINT "Sleep_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaperChange" ADD CONSTRAINT "DiaperChange_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightHeight" ADD CONSTRAINT "WeightHeight_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccineDose" ADD CONSTRAINT "VaccineDose_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaccineDose" ADD CONSTRAINT "VaccineDose_catalogVaccineId_fkey" FOREIGN KEY ("catalogVaccineId") REFERENCES "VaccineCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneCompletion" ADD CONSTRAINT "MilestoneCompletion_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MilestoneCompletion" ADD CONSTRAINT "MilestoneCompletion_catalogMilestoneId_fkey" FOREIGN KEY ("catalogMilestoneId") REFERENCES "MilestoneCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstMoment" ADD CONSTRAINT "FirstMoment_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrentSession" ADD CONSTRAINT "CurrentSession_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;
