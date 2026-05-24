-- CreateEnum
CREATE TYPE "RevisionKind" AS ENUM ('INITIAL', 'EDIT', 'DELETE');

-- CreateTable
CREATE TABLE "WeightHeightRevision" (
    "id" UUID NOT NULL,
    "measurementId" UUID NOT NULL,
    "kind" "RevisionKind" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "note" TEXT,
    "editedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightHeightRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeightHeightRevision_measurementId_createdAt_idx" ON "WeightHeightRevision"("measurementId", "createdAt");

-- AddForeignKey
ALTER TABLE "WeightHeightRevision" ADD CONSTRAINT "WeightHeightRevision_measurementId_fkey" FOREIGN KEY ("measurementId") REFERENCES "WeightHeight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightHeightRevision" ADD CONSTRAINT "WeightHeightRevision_editedByUserId_fkey" FOREIGN KEY ("editedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
