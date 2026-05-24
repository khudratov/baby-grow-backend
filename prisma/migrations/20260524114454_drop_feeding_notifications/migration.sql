/*
  Warnings:

  - The values [FEEDING_STARTED,FEEDING_ENDED] on the enum `NotificationKind` will be removed. If these variants are still used in the database, this will fail.

*/
-- Drop historical feeding notifications that reference enum values we're about to remove.
DELETE FROM "Notification" WHERE "kind" IN ('FEEDING_STARTED', 'FEEDING_ENDED');

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationKind_new" AS ENUM ('DIAPER_LOGGED', 'DIAPER_STOCK_LOW', 'SLEEP_STARTED', 'SLEEP_ENDED');
ALTER TABLE "Notification" ALTER COLUMN "kind" TYPE "NotificationKind_new" USING ("kind"::text::"NotificationKind_new");
ALTER TYPE "NotificationKind" RENAME TO "NotificationKind_old";
ALTER TYPE "NotificationKind_new" RENAME TO "NotificationKind";
DROP TYPE "NotificationKind_old";
COMMIT;
