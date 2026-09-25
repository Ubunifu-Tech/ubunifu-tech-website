-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('open', 'approved', 'changes_requested', 'withdrawn');

-- CreateTable
CREATE TABLE "ProjectReview" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "previewUrl" TEXT,
    "note" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'open',
    "askedById" TEXT,
    "answeredById" TEXT,
    "answeredAt" TIMESTAMP(3),
    "answer" TEXT,
    "withdrawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectReview_projectId_status_idx" ON "ProjectReview"("projectId", "status");

-- CreateIndex
CREATE INDEX "ProjectReview_status_idx" ON "ProjectReview"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectReview_projectId_round_key" ON "ProjectReview"("projectId", "round");

-- AddForeignKey
ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_askedById_fkey" FOREIGN KEY ("askedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_answeredById_fkey" FOREIGN KEY ("answeredById") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
