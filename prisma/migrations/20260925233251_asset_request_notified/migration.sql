-- AlterTable
ALTER TABLE "AssetRequest" ADD COLUMN     "notifiedAt" TIMESTAMP(3);

-- Items asked for before these emails existed were already in the client's
-- portal. Count them as known, so no project shows a backlog of "not emailed
-- yet" for things the client has been looking at for weeks.
UPDATE "AssetRequest" SET "notifiedAt" = "createdAt" WHERE "notifiedAt" IS NULL;
