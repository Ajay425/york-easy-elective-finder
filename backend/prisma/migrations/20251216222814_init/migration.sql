-- CreateTable
CREATE TABLE "CourseTime" (
    "id" SERIAL NOT NULL,
    "currentCourseId" INTEGER NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "endTime" TEXT,

    CONSTRAINT "CourseTime_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CourseTime" ADD CONSTRAINT "CourseTime_currentCourseId_fkey" FOREIGN KEY ("currentCourseId") REFERENCES "CurrentCourseOfferings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
