-- CreateEnum
CREATE TYPE "RenewalStatus" AS ENUM ('pending', 'drafted', 'invoiced', 'paid', 'skipped', 'cancelled');

-- AlterEnum
ALTER TYPE "SignatureMethod" ADD VALUE 'initials';

-- AlterTable
ALTER TABLE "ClientContact" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "failedSignIns" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "passwordSetAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LineItem" ADD COLUMN     "intervalMonths" INTEGER,
ADD COLUMN     "nextDueAt" TIMESTAMP(3),
ADD COLUMN     "renewalLeadDays" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "Signature" ADD COLUMN     "initials" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersionId" TEXT,
ALTER COLUMN "method" SET DEFAULT 'initials';

-- AlterTable
ALTER TABLE "SignatureRequest" ADD COLUMN     "termsVersionId" TEXT;

-- CreateTable
CREATE TABLE "RenewalEvent" (
    "id" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "RenewalStatus" NOT NULL DEFAULT 'pending',
    "invoiceId" TEXT,
    "draftedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenewalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TermsVersion" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermsVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RenewalEvent_status_dueAt_idx" ON "RenewalEvent"("status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "RenewalEvent_lineItemId_periodStart_key" ON "RenewalEvent"("lineItemId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "TermsVersion_version_key" ON "TermsVersion"("version");

-- CreateIndex
CREATE INDEX "TermsVersion_isCurrent_idx" ON "TermsVersion"("isCurrent");

-- CreateIndex
CREATE INDEX "LineItem_nextDueAt_idx" ON "LineItem"("nextDueAt");

-- AddForeignKey
ALTER TABLE "RenewalEvent" ADD CONSTRAINT "RenewalEvent_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "LineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenewalEvent" ADD CONSTRAINT "RenewalEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRequest" ADD CONSTRAINT "SignatureRequest_termsVersionId_fkey" FOREIGN KEY ("termsVersionId") REFERENCES "TermsVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_termsVersionId_fkey" FOREIGN KEY ("termsVersionId") REFERENCES "TermsVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
