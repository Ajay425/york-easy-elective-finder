import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const listPath = path.join(__dirname, 'step13_coursesWithoutRealPrereqs.json');
const reportPath = path.join(__dirname, 'step13_removedPrereqsReport.json');

function normalizeCourseEntry(entry) {
  return {
    faculty: String(entry.faculty ?? '').trim(),
    deptAcronym: String(entry.deptAcronym ?? '').trim(),
    courseCode: String(entry.courseCode ?? '').trim(),
    credit: Number(entry.credit),
    reason: entry.reason ? String(entry.reason).trim() : null,
    courseDescription: entry.courseDescription
      ? String(entry.courseDescription).trim()
      : null,
  };
}

function isValidCourseEntry(entry) {
  return Boolean(
    entry.faculty &&
    entry.deptAcronym &&
    entry.courseCode &&
    Number.isFinite(entry.credit)
  );
}

async function loadCourseList() {
  const raw = await fs.readFile(listPath, 'utf-8');
  const parsed = JSON.parse(raw);
  const courses = Array.isArray(parsed?.courses) ? parsed.courses : [];
  return courses.map(normalizeCourseEntry).filter(isValidCourseEntry);
}

async function main() {
  const courses = await loadCourseList();

  if (courses.length === 0) {
    const emptyReport = {
      processedAt: new Date().toISOString(),
      removedCourses: [],
      skippedCourses: [],
      totalCoursesListed: 0,
      totalPrereqRowsDeleted: 0,
    };
    await fs.writeFile(reportPath, JSON.stringify(emptyReport, null, 2), 'utf-8');
    console.log('No courses listed in step13_coursesWithoutRealPrereqs.json. Nothing to remove.');
    return;
  }

  const removedCourses = [];
  const skippedCourses = [];
  let totalPrereqRowsDeleted = 0;

  for (const courseEntry of courses) {
    const course = await prisma.course.findUnique({
      where: {
        faculty_deptAcronym_courseCode_credit: {
          faculty: courseEntry.faculty,
          deptAcronym: courseEntry.deptAcronym,
          courseCode: courseEntry.courseCode,
          credit: courseEntry.credit,
        },
      },
      select: {
        id: true,
        faculty: true,
        deptAcronym: true,
        courseCode: true,
        credit: true,
        name: true,
      },
    });

    if (!course) {
      skippedCourses.push({
        ...courseEntry,
        status: 'course_not_found',
      });
      continue;
    }

    const deleted = await prisma.coursePrerequisite.deleteMany({
      where: { courseId: course.id },
    });

    totalPrereqRowsDeleted += deleted.count;
    removedCourses.push({
      id: course.id,
      faculty: course.faculty,
      deptAcronym: course.deptAcronym,
      courseCode: course.courseCode,
      credit: course.credit,
      name: course.name,
      reason: courseEntry.reason,
      courseDescription: courseEntry.courseDescription,
      deletedPrereqRows: deleted.count,
    });
  }

  const report = {
    processedAt: new Date().toISOString(),
    totalCoursesListed: courses.length,
    totalPrereqRowsDeleted,
    removedCourses,
    skippedCourses,
  };

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Processed ${courses.length} listed courses.`);
  console.log(`Removed ${totalPrereqRowsDeleted} prerequisite rows.`);
  console.log(`Saved report to ${reportPath}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });