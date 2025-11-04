-- CreateTable
CREATE TABLE "CoursePrerequisite" (
    "id" SERIAL NOT NULL,
    "courseId" INTEGER NOT NULL,
    "prereqId" INTEGER NOT NULL,

    CONSTRAINT "CoursePrerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoursePrerequisite_courseId_prereqId_key" ON "CoursePrerequisite"("courseId", "prereqId");

-- AddForeignKey
ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
