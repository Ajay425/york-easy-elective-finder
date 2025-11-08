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


const vals = [1.0]
const years = [1]
const courses = await prisma.course.findMany({
  where: {
    credit: {
      in: vals, // matches credit = 1.0 OR 3.0 OR 5.0
    },
    year:{
      in:years
    }
  },
  orderBy:{
    id:'desc'
  }
})
console.log(courses)
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
