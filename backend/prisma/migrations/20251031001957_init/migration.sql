/*
  Warnings:

  - A unique constraint covering the columns `[deptAcronym,courseCode,credit]` on the table `Course` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Course_deptAcronym_courseCode_key";

-- CreateIndex
CREATE UNIQUE INDEX "Course_deptAcronym_courseCode_credit_key" ON "Course"("deptAcronym", "courseCode", "credit");
