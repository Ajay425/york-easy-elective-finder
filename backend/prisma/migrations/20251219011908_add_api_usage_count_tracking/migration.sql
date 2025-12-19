-- CreateTable
CREATE TABLE "ApiUsageCount" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiUsageCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiUsageCount_date_key" ON "ApiUsageCount"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ApiUsageCount_date_endpoint_key" ON "ApiUsageCount"("date", "endpoint");
