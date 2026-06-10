-- CreateEnum
CREATE TYPE "DiaperVia" AS ENUM ('DIAPER', 'POTTY');

-- AlterTable
ALTER TABLE "DiaperChange" ADD COLUMN     "via" "DiaperVia" NOT NULL DEFAULT 'DIAPER';
