-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "writerId" TEXT;

-- CreateTable
CREATE TABLE "Writer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "bio" TEXT,
    "link" TEXT,
    "photo" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Writer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Writer_name_idx" ON "Writer"("name");

-- CreateIndex
CREATE INDEX "Post_writerId_idx" ON "Post"("writerId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_writerId_fkey" FOREIGN KEY ("writerId") REFERENCES "Writer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
