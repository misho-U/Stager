-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "fileContentType" TEXT,
ADD COLUMN     "filePathname" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "fileUrl" TEXT,
ADD COLUMN     "posterMediaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "videos_filePathname_key" ON "videos"("filePathname");

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_posterMediaId_fkey" FOREIGN KEY ("posterMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

