-- AlterEnum
ALTER TYPE "MagicTokenPurpose" ADD VALUE 'shared_link';

-- AlterTable
ALTER TABLE "Signature" ALTER COLUMN "signerEmail" DROP NOT NULL;
