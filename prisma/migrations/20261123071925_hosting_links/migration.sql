-- CreateEnum
CREATE TYPE "OverdueNoticeChannel" AS ENUM ('email', 'whatsapp', 'phone', 'in_person', 'letter');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "hostingPausedAt" TIMESTAMP(3),
ADD COLUMN     "vercelProjectId" TEXT,
ADD COLUMN     "vercelProjectName" TEXT;

-- CreateTable
CREATE TABLE "OverdueNotice" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "givenAt" TIMESTAMP(3) NOT NULL,
    "channel" "OverdueNoticeChannel" NOT NULL,
    "note" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OverdueNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OverdueNotice_invoiceId_idx" ON "OverdueNotice"("invoiceId");

-- AddForeignKey
ALTER TABLE "OverdueNotice" ADD CONSTRAINT "OverdueNotice_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverdueNotice" ADD CONSTRAINT "OverdueNotice_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
