-- AlterTable
ALTER TABLE "AssetRequest" ADD COLUMN     "assigneeId" TEXT;

-- AlterTable
ALTER TABLE "Deliverable" ADD COLUMN     "assigneeId" TEXT,
ADD COLUMN     "dueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StaffUser" ADD COLUMN     "title" TEXT;

-- CreateIndex
CREATE INDEX "AssetRequest_assigneeId_idx" ON "AssetRequest"("assigneeId");

-- CreateIndex
CREATE INDEX "Deliverable_assigneeId_idx" ON "Deliverable"("assigneeId");

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRequest" ADD CONSTRAINT "AssetRequest_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
