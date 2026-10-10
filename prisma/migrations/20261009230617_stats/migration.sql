-- CreateTable
CREATE TABLE "stats" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stat_translations" (
    "id" TEXT NOT NULL,
    "statId" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "stat_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stats_isActive_order_idx" ON "stats"("isActive", "order");

-- CreateIndex
CREATE UNIQUE INDEX "stat_translations_statId_locale_key" ON "stat_translations"("statId", "locale");

-- AddForeignKey
ALTER TABLE "stat_translations" ADD CONSTRAINT "stat_translations_statId_fkey" FOREIGN KEY ("statId") REFERENCES "stats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Row Level Security, as on every other table (20260918000100_enable_rls):
-- enabled with NO policies, so the Supabase anon and authenticated roles read
-- and write nothing, while Prisma, the tables' owner, is unaffected.
ALTER TABLE "stats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stat_translations" ENABLE ROW LEVEL SECURITY;
