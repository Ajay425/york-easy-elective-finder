/*
  Warnings:

  - A unique constraint covering the columns `[deptAcronym,courseCode]` on the table `Course` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Course_deptAcronym_courseCode_key" ON "Course"("deptAcronym", "courseCode");
