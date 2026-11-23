-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "signerId" TEXT;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
