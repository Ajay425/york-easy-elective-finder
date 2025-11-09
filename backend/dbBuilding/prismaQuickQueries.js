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



const termsFromFrontend = ['F', 'W', 'Y'];
const typesFromFrontend = ['LECT', 'ONLN'];
const yearsFromFrontend = [1, 2];
const deptAcronymFrotnend = ['EECS']
const creditsFromFrontend = [1, 3];
const courses = await prisma.course.findMany({
  where: {
    deptAcronym:{ in: deptAcronymFrotnend},
      year: { in: yearsFromFrontend },
    credit: { in: creditsFromFrontend },
    courseOfferings: {
      some: {
        term: { in: termsFromFrontend },
        type: { in: typesFromFrontend },
      },
    },
  },
  include: {
    courseOfferings: true, // include all offerings, or still filter if you want
  },
  orderBy: {
    id: 'desc',
  },
});

// console.log(JSON.stringify(courses, null, 2));

const uniqueness = await prisma.Instructors.findMany({
  where:{
    avgDifficulty:{
      gte:0
    },
    numberOfRatings:{
      gte:100
    },
    wouldTakeAgainPercent:{
      gte:90
    }
  },

  orderBy:{
    numberOfRatings:'desc'
  },
  take:20

})

// console.log(uniqueness)


const counts = await prisma.instructors.groupBy({
  by: ['avgDifficulty'],  // column(s) to group by
  _count: {
    avgDifficulty: true,  // count of rows in each group
  },
  orderBy:{
    avgDifficulty:'desc'
  }
})

// console.log(counts)
const simplified = counts.map(item => ({
  avgDifficulty: item.avgDifficulty,
  count: item._count.avgDifficulty,
}))

console.log(simplified)

const uniqueSections = await prisma.currentCourseOfferings.findMany({
  distinct: ['term'],
  select: {
    term: true,
  },
});

console.log(uniqueSections);

const uniqueTypes = await prisma.currentCourseOfferings.findMany({
  distinct: ['type'],
  select: {
    type: true,
  },
});


console.log(uniqueTypes);

const types = ['LECT','BLEN', 'ONLN']
const test = await prisma.currentCourseOfferings.findMany({
  where:{
    type: {
      in: types
    },
    term:'F'
  },
  include:{
    course:true
  },
  take:20
})
// console.log(test)
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
