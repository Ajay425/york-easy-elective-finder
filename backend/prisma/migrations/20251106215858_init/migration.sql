-- CreateTable
CREATE TABLE "CurrentCourseOfferings" (
    "id" SERIAL NOT NULL,
    "term" TEXT NOT NULL,
    "courseId" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "CurrentCourseOfferings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorOfferings" (
    "id" SERIAL NOT NULL,
    "instructorId" INTEGER NOT NULL,
    "courseOfferingId" INTEGER NOT NULL,

    CONSTRAINT "InstructorOfferings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CurrentCourseOfferings_term_courseId_section_type_key" ON "CurrentCourseOfferings"("term", "courseId", "section", "type");

-- AddForeignKey
ALTER TABLE "CurrentCourseOfferings" ADD CONSTRAINT "CurrentCourseOfferings_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorOfferings" ADD CONSTRAINT "InstructorOfferings_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Professor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorOfferings" ADD CONSTRAINT "InstructorOfferings_courseOfferingId_fkey" FOREIGN KEY ("courseOfferingId") REFERENCES "CurrentCourseOfferings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
