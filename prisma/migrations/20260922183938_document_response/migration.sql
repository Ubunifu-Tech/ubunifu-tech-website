-- AlterTable
ALTER TABLE "SignatureRequest" ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "respondedById" TEXT,
ADD COLUMN     "responseNote" TEXT;

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
