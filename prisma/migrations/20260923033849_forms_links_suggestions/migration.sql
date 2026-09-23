-- AlterTable
ALTER TABLE "AssetRequest" ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "response" TEXT;

-- AlterTable
ALTER TABLE "ClientContact" ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DocumentSuggestion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "contactId" TEXT,
    "basedOnVersion" INTEGER NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentSuggestion_documentId_status_idx" ON "DocumentSuggestion"("documentId", "status");

-- AddForeignKey
ALTER TABLE "DocumentSuggestion" ADD CONSTRAINT "DocumentSuggestion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSuggestion" ADD CONSTRAINT "DocumentSuggestion_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
