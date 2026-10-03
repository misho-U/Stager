-- CreateEnum
CREATE TYPE "CourseFormat" AS ENUM ('IN_PERSON', 'ONLINE');

-- CreateEnum
CREATE TYPE "VideoKind" AS ENUM ('EPISODE', 'PODCAST', 'MASTERCLASS');

-- CreateTable
CREATE TABLE "course_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_category_translations" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "course_category_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT,
    "serviceId" TEXT,
    "coverMediaId" TEXT,
    "format" "CourseFormat" NOT NULL DEFAULT 'IN_PERSON',
    "startsAt" DATE,
    "seatsTotal" INTEGER,
    "seatsLeft" INTEGER,
    "priceGel" INTEGER,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_translations" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "duration" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "course_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "youtubeUrl" TEXT,
    "kind" "VideoKind",
    "publishedAt" DATE NOT NULL,
    "durationMinutes" INTEGER,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_translations" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "video_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "course_categories_slug_key" ON "course_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "course_category_translations_categoryId_locale_key" ON "course_category_translations"("categoryId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_status_startsAt_idx" ON "courses"("status", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "course_translations_courseId_locale_key" ON "course_translations"("courseId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "videos_slug_key" ON "videos"("slug");

-- CreateIndex
CREATE INDEX "videos_status_publishedAt_idx" ON "videos"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "video_translations_videoId_locale_key" ON "video_translations"("videoId", "locale");

-- AddForeignKey
ALTER TABLE "course_category_translations" ADD CONSTRAINT "course_category_translations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "course_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "course_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_translations" ADD CONSTRAINT "course_translations_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_translations" ADD CONSTRAINT "video_translations_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security, as on every other table (20260918000100_enable_rls):
-- enabled with NO policies, so the Supabase anon and authenticated roles read
-- and write nothing, while Prisma, the tables' owner, is unaffected.
ALTER TABLE "course_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "course_category_translations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "course_translations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "videos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "video_translations" ENABLE ROW LEVEL SECURITY;
