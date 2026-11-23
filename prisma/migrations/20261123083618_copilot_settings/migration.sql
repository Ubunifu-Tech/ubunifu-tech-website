-- CreateEnum
CREATE TYPE "AgentMemorySource" AS ENUM ('settings', 'chat');

-- CreateTable
CREATE TABLE "AgentInstruction" (
    "kind" "ConversationKind" NOT NULL,
    "text" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentInstruction_pkey" PRIMARY KEY ("kind")
);

-- CreateTable
CREATE TABLE "AgentMemory" (
    "id" TEXT NOT NULL,
    "staffId" TEXT,
    "text" TEXT NOT NULL,
    "source" "AgentMemorySource" NOT NULL DEFAULT 'settings',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentMemory_staffId_removedAt_idx" ON "AgentMemory"("staffId", "removedAt");

-- CreateIndex
CREATE INDEX "Conversation_kind_actorId_lastMessageAt_idx" ON "Conversation"("kind", "actorId", "lastMessageAt");
