-- AlterTable
ALTER TABLE "FileUpload" ADD COLUMN     "costId" TEXT;

-- CreateIndex
CREATE INDEX "FileUpload_costId_idx" ON "FileUpload"("costId");

-- AddForeignKey
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_costId_fkey" FOREIGN KEY ("costId") REFERENCES "Cost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

