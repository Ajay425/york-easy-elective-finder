/*
  Warnings:

  - A unique constraint covering the columns `[instructorId,courseOfferingId]` on the table `InstructorOfferings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "InstructorOfferings_instructorId_courseOfferingId_key" ON "InstructorOfferings"("instructorId", "courseOfferingId");
