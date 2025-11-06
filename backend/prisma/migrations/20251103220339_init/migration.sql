-- AddForeignKey
ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_prereqId_fkey" FOREIGN KEY ("prereqId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
