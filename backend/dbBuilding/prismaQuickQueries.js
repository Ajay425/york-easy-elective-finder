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


// console.log(uniqueTypes);
// inputs you already have:
const terms = ['F'];                 // e.g. ['F','W']
const types = ['LECT','BLEN','ONLN'];
const years = [1];
const depts = ['CHEM'];
const faculties = ['SC'];

// const courses5 = await prisma.course.findMany({
//   where: {
//     year: { in: years },
//     deptAcronym: { in: depts },
//     faculty: { in: faculties },
//     prerequisites: { none: {} },
//     courseOfferings: { some: { term: { in: terms }, type: { in: types } } },
//   },
//   include: {
//     prerequisites:true,
//     courseOfferings: {
//       where: { term: { in: terms }, type: { in: types } },
//       include: {
//         instructors: {
//           include: { instructor: true },
//           orderBy: { instructor: { popularity: 'desc' } },
//           take: 1, // <-- only the most popular per offering
//         },
//       },
//     },
//   },
// });
// // you already did this per course:
// for (const c of courses5) {
//   c.courseOfferings.sort((a, b) => {
//     const popA = a.instructors[0]?.instructor?.popularity ?? -1
//     const popB = b.instructors[0]?.instructor?.popularity ?? -1
//     return popB - popA // most-popular offering first
//   })
// }

// // now sort the WHOLE courses list by the top instructor of the top offering
// courses5.sort((a, b) => {
//   const bestA = a.courseOfferings[0]?.instructors[0]?.instructor?.popularity ?? -1
//   const bestB = b.courseOfferings[0]?.instructors[0]?.instructor?.popularity ?? -1
//   if (bestB !== bestA) return bestB - bestA

//   // optional tie-breakers:
//   const nA = a.courseOfferings[0]?.instructors[0]?.instructor?.numberOfRatings ?? -1
//   const nB = b.courseOfferings[0]?.instructors[0]?.instructor?.numberOfRatings ?? -1
//   if (nB !== nA) return nB - nA

//   // final stable tie-breaker (course code/alpha)
//   return `${a.deptAcronym}${a.courseCode}`.localeCompare(`${b.deptAcronym}${b.courseCode}`)
// })

console.dir(courses5, { depth: null })
const courses6 = await prisma.course.findMany({
  where: {
    year: { in: years },
    deptAcronym: { in: depts },
    faculty: { in: faculties },
    prerequisites: { none: {} },
    courseOfferings: { some: { term: { in: terms }, type: { in: types } } },
  },

})
console.log(courses6)
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
