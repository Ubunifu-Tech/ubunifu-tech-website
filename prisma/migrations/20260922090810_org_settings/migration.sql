-- CreateTable
CREATE TABLE "OrgSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "legalName" TEXT NOT NULL DEFAULT 'Ubunifu Technologies',
    "tradingName" TEXT,
    "tin" TEXT,
    "vrn" TEXT,
    "addressLines" TEXT,
    "country" TEXT NOT NULL DEFAULT 'TZ',
    "email" TEXT NOT NULL DEFAULT 'info@ubunifutech.com',
    "phone" TEXT,
    "website" TEXT,
    "vatRateBps" INTEGER NOT NULL DEFAULT 0,
    "chargesVat" BOOLEAN NOT NULL DEFAULT false,
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankSwift" TEXT,
    "mobileMoneyName" TEXT,
    "mobileMoneyNumber" TEXT,
    "invoiceFooter" TEXT,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 14,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgSettings_pkey" PRIMARY KEY ("id")
);
