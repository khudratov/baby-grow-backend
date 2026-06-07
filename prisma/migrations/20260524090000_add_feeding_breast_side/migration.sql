-- CreateEnum
CREATE TYPE "BreastSide" AS ENUM ('L', 'R');

-- AlterTable
ALTER TABLE "Feeding" ADD COLUMN     "activeSide" "BreastSide",
ADD COLUMN     "paused" BOOLEAN NOT NULL DEFAULT false;
