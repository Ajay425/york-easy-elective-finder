-- CreateTable
CREATE TABLE "Faculty" (
    "acronym" TEXT NOT NULL,
    "longForm" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("acronym")
);

-- CreateTable
CREATE TABLE "Department" (
    "acronym" TEXT NOT NULL,
    "longForm" TEXT,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("acronym")
);

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_acronym_key" ON "Faculty"("acronym");

-- CreateIndex
CREATE UNIQUE INDEX "Department_acronym_key" ON "Department"("acronym");
