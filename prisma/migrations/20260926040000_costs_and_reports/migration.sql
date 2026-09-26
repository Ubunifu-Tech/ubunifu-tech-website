-- CreateEnum
CREATE TYPE "CostCategory" AS ENUM ('hosting', 'email', 'domains', 'ai', 'software', 'services', 'other');

-- CreateTable
CREATE TABLE "Cost" (
    "id" TEXT NOT NULL,
    "incurredOn" TIMESTAMP(3) NOT NULL,
    "vendor" TEXT NOT NULL,
    "category" "CostCategory" NOT NULL,
    "description" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "regularId" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegularCost" (
    "id" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "category" "CostCategory" NOT NULL,
    "description" TEXT,
    "usualMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "clientId" TEXT,
    "projectId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegularCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rate" DECIMAL(20,8) NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cost_incurredOn_idx" ON "Cost"("incurredOn");

-- CreateIndex
CREATE INDEX "Cost_clientId_idx" ON "Cost"("clientId");

-- CreateIndex
CREATE INDEX "Cost_regularId_incurredOn_idx" ON "Cost"("regularId", "incurredOn");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_month_base_quote_key" ON "ExchangeRate"("month", "base", "quote");

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_regularId_fkey" FOREIGN KEY ("regularId") REFERENCES "RegularCost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegularCost" ADD CONSTRAINT "RegularCost_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegularCost" ADD CONSTRAINT "RegularCost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

