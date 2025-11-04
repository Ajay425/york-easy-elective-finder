/*
  Warnings:

  - A unique constraint covering the columns `[faculty,deptAcronym,courseCode,credit]` on the table `Course` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `faculty` to the `Course` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Course_deptAcronym_courseCode_credit_name_language_key";

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "faculty" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Course_faculty_deptAcronym_courseCode_credit_key" ON "Course"("faculty", "deptAcronym", "courseCode", "credit");
