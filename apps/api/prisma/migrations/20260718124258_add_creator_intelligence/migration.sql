-- AlterTable
ALTER TABLE "Creator" ADD COLUMN     "channelDescription" TEXT,
ADD COLUMN     "channelPublishedAt" TIMESTAMP(3),
ADD COLUMN     "channelTitle" TEXT,
ADD COLUMN     "channelViewCount" BIGINT,
ADD COLUMN     "lastProfileSyncAt" TIMESTAMP(3),
ADD COLUMN     "niche" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "subscriberCount" INTEGER;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "description" TEXT,
ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "title" TEXT;

-- CreateTable
CREATE TABLE "SubmissionMetricSnapshot" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "views" INTEGER NOT NULL,
    "likes" INTEGER NOT NULL,
    "comments" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmissionMetricSnapshot_submissionId_capturedAt_idx" ON "SubmissionMetricSnapshot"("submissionId", "capturedAt");

-- AddForeignKey
ALTER TABLE "SubmissionMetricSnapshot" ADD CONSTRAINT "SubmissionMetricSnapshot_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
