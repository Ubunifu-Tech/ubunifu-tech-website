-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "firstPublishedAt" TIMESTAMP(3);

-- Anything already dated has been public, or was imported from the files
-- that were. Its address stays fixed.
UPDATE "Post" SET "firstPublishedAt" = "publishedAt" WHERE "publishedAt" IS NOT NULL;
