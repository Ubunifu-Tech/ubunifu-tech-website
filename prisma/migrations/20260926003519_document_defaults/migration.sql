-- CreateTable
CREATE TABLE "DocumentDefault" (
    "kind" "DocumentKind" NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "DocumentDefault_pkey" PRIMARY KEY ("kind")
);
