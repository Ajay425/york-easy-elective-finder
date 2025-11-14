import { fileURLToPath } from 'url';
import path from 'path';
import { PrismaClient } from '../generated/prisma/index.js';
import { connect } from 'http2';
import fs from 'fs';
const prisma = new PrismaClient();

import { extractPrereqsWithCredits } from "./parsePrereqsHelperFunc.js";

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
  for (const c of courses6) {
    if (!c.desc) continue;

    const prereqs = extractPrereqsWithCredits(c.desc);
    if (prereqs.length === 0) continue;

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
        console.log(`Skipping self-prerequisite: ${courseId}`);
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
        if (e.code === 'P2002') continue;
        throw e;
      }
    }

    console.log(`Processed course ${c.courseCode}: added ${prereqs.length} prereqs (deduped by constraints).`);
  }
}

// Example usage:
const courses6 = await prisma.course.findMany({
  where: { prerequisites: { none: {} } }, // only those with no prereq links yet
});

// Run it
await processCourses(prisma, courses6);


async function main() {


const courses6 = await prisma.course.findMany({
  where: {

    prerequisites: { none: {} },
  },
})
await processCourses(prisma, courses6);
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
