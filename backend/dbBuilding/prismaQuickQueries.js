import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';  // Importing fs.promises for reading files
import { PrismaClient } from '../generated/prisma/index.js';
import { connect } from 'http2';

const prisma = new PrismaClient();

// Current file and directory paths in ES Module scope
const __filename = fileURLToPath(import.meta.url);
console.log(`${__filename} FILENAME`)

const __dirname = path.dirname(__filename);
console.log(`${__dirname} DIRNAME`)

// Course data directory
const filePath = path.join(__dirname, '../data/all_courses.json');


async function main() {
// const cterms = await prisma.currentCourseOfferings.findMany({
//   where: { courseId: 3676 },
//   include: {
//     course: true, // the Course row
//     instructors: {
//       include: {
//         instructor: true, // the Instructors row for each join
//       },
//     },
//   },
// });

// console.dir(cterms, { depth: null });
 const cterms = await prisma.Instructors.findMany({
    orderBy:{
      numberOfRatings:"desc"
    }
 })
//  console.log(cterms)

//  const res = await prisma.$queryRaw
//   ` SELECT * FROM "InstructorOfferings" 
//     WHERE "instructorId" in (
//     SELECT "id" FROM "Professor"
//     ORder by "numberOfRatings" desc)`
//  console.log(res)
const vals = { values: ['1.0', '3.0'] }
console.log(vals.val1)
 const res = await prisma.$queryRaw
  ` SELECT * FROM "Course" 
    WHERE credit <= ${vals[0]}` 
 console.log(res)
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
