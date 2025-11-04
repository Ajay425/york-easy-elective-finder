/*
  Warnings:

  - A unique constraint covering the columns `[deptAcronym,courseCode,credit,name,language]` on the table `Course` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Course_deptAcronym_courseCode_credit_language_key";

-- CreateIndex
CREATE UNIQUE INDEX "Course_deptAcronym_courseCode_credit_name_language_key" ON "Course"("deptAcronym", "courseCode", "credit", "name", "language");
