/*
  Warnings:

  - A unique constraint covering the columns `[deptAcronym,courseCode,credit,language]` on the table `Course` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `language` to the `Course` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Course_deptAcronym_courseCode_credit_key";

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "language" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Course_deptAcronym_courseCode_credit_language_key" ON "Course"("deptAcronym", "courseCode", "credit", "language");
