-- AlterEnum
ALTER TYPE "ConversationKind" ADD VALUE 'console_staff';

-- CreateEnum
CREATE TYPE "AssistantPlanStatus" AS ENUM ('pending', 'running', 'done', 'stopped', 'discarded', 'superseded');

-- CreateTable
CREATE TABLE "AssistantPlan" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "status" "AssistantPlanStatus" NOT NULL DEFAULT 'pending',
    "summary" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "results" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "AssistantPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistantPlan_conversationId_status_idx" ON "AssistantPlan"("conversationId", "status");

-- AddForeignKey
ALTER TABLE "AssistantPlan" ADD CONSTRAINT "AssistantPlan_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
