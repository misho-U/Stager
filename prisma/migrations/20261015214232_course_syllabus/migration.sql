-- CreateTable
CREATE TABLE "course_modules" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_module_translations" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "title" TEXT NOT NULL,
    "duration" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "course_module_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_modules_courseId_order_idx" ON "course_modules"("courseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "course_module_translations_moduleId_locale_key" ON "course_module_translations"("moduleId", "locale");

-- AddForeignKey
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_module_translations" ADD CONSTRAINT "course_module_translations_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "course_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
