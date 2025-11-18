-- DropForeignKey
ALTER TABLE "InstructorOfferings" DROP CONSTRAINT "InstructorOfferings_courseOfferingId_fkey";

-- DropForeignKey
ALTER TABLE "InstructorOfferings" DROP CONSTRAINT "InstructorOfferings_instructorId_fkey";

-- AlterTable
ALTER TABLE "CurrentCourseOfferings" ADD COLUMN     "catNumber" TEXT;

-- AddForeignKey
ALTER TABLE "InstructorOfferings" ADD CONSTRAINT "InstructorOfferings_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Professor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorOfferings" ADD CONSTRAINT "InstructorOfferings_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CurrentCourseOfferings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
