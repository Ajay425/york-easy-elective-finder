import { fileURLToPath } from 'url';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { connect } from 'http2';
import fs from 'fs';
const prisma = new PrismaClient();

import { extractPrereqsWithCredits } from "./parsePrereqsHelperFunc.js";

const PROGRESS_EVERY = 200;

// Helper: create the course or fetch it if it already exists
async function getOrCreateCourse(prisma, pr) {
  try {
    const created = await prisma.course.create({
      data: {
        faculty: pr.faculty,
        deptAcronym: pr.dept,
        courseCode: pr.code,
        credit: pr.credits,
        year: pr.year,
      },
    });
    return created;
  } catch (e) {
    // Duplicate: already exists → fetch and return
    if (e.code === 'P2002') {
      return prisma.course.findUnique({
        where: {
          // uses your composite unique
          faculty_deptAcronym_courseCode_credit: {
            faculty: pr.faculty,
            deptAcronym: pr.dept,
            courseCode: pr.code,
            credit: pr.credits,
          },
        },
      });
    }
    // Any other error → bubble up
    throw e;
  }
}

async function processCourses(prisma, courses6) {
  const stats = {
    coursesScanned: 0,
    coursesWithPrereqs: 0,
    prereqLinksCreated: 0,
    selfPrereqsSkipped: 0,
    duplicateLinksSkipped: 0,
  };

  for (const c of courses6) {
    stats.coursesScanned++;
    if (!c.desc) continue;

    const prereqs = extractPrereqsWithCredits(c.desc, {
      faculty: c.faculty,
      deptAcronym: c.deptAcronym,
    });
    if (prereqs.length === 0) continue;
    stats.coursesWithPrereqs++;

    // Make sure the "target" course (the one that has prereqs) exists & we have its id
    // (since your query pulled existing courses, c.id should already exist,
    // but if you’re being defensive, you could ensure it here.)
    const courseId = c.id;

    for (const pr of prereqs) {
      // 1) Ensure the prereq course exists; get its id
      const prereqCourse = await getOrCreateCourse(prisma, pr);
      if (!prereqCourse) {
        console.warn(`Could not resolve prereq course for ${pr.full}`);
        continue;
      }

      //Skip if it's a self-prereq
      if (courseId === prereqCourse.id) {
        stats.selfPrereqsSkipped++;
        continue;
      }
      // 2) Link: c (courseId) requires prereqCourse (prereqId)
      try {
        await prisma.coursePrerequisite.create({
          data: {
            courseId: courseId,
            prereqId: prereqCourse.id,
          },
        });
      } catch (e) {
        // Duplicate relation → skip
        if (e.code === 'P2002') {
          stats.duplicateLinksSkipped++;
          continue;
        }
        throw e;
      }

      stats.prereqLinksCreated++;
    }

    if (
      stats.coursesScanned === 1 ||
      stats.coursesScanned % PROGRESS_EVERY === 0 ||
      stats.coursesScanned === courses6.length
    ) {
      console.log(
        `[step3] Progress ${stats.coursesScanned}/${courses6.length} | coursesWithPrereqs=${stats.coursesWithPrereqs} linksCreated=${stats.prereqLinksCreated}`
      );
    }
  }

  return stats;
}


async function main() {


const courses6 = await prisma.course.findMany({
  where: {

    prerequisites: { none: {} },
  },
})
const stats = await processCourses(prisma, courses6);
console.log(`[step3] Summary: ${JSON.stringify(stats)}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
