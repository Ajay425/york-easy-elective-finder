/*
  Warnings:

  - A unique constraint covering the columns `[termAndYear,courseId,section,type]` on the table `CurrentCourseOfferings` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CurrentCourseOfferings_term_courseId_section_type_key";

-- AlterTable
ALTER TABLE "CurrentCourseOfferings" ADD COLUMN     "termAndYear" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CurrentCourseOfferings_termAndYear_courseId_section_type_key" ON "CurrentCourseOfferings"("termAndYear", "courseId", "section", "type");
