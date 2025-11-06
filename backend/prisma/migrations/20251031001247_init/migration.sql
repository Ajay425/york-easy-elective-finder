/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."User";

-- CreateTable
CREATE TABLE "Course" (
    "id" SERIAL NOT NULL,
    "deptAcronym" TEXT NOT NULL,
    "courseCode" TEXT NOT NULL,
    "credit" DOUBLE PRECISION NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);
