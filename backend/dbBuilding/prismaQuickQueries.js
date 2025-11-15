import { fileURLToPath } from 'url';
import path from 'path';
import { PrismaClient } from '../generated/prisma/index.js';
import { connect } from 'http2';
import fs from 'fs';
import { dmmfToRuntimeDataModel } from '../generated/prisma/runtime/library.js';

const prisma = new PrismaClient();

async function main() {
  // Get unique faculties
//   const uniqueFaculties = await prisma.course.findMany({
//     distinct: ['faculty'],
//     select: { faculty: true },
//   });

//   // Get unique department acronyms
//   const uniqueDepts = await prisma.course.findMany({
//     distinct: ['deptAcronym'],
//     select: { deptAcronym: true },
//   });



//  // Flatten to arrays of strings and sort alphabetically
//   const faculties = uniqueFaculties.map(f => f.faculty).sort();
//   const departments = uniqueDepts.map(d => d.deptAcronym).sort();

//   // Combine into one object
//   const data = {
//     faculties,
//     departments,
//   };

//   // Write to file
//   fs.writeFileSync(
//     'facultiesAndDepts.json',
//     JSON.stringify(data, null, 2),
//     'utf-8'
//   );

//   console.log(
//     `✅ Wrote ${faculties.length} faculties and ${departments.length} departments to facultiesAndDepts.json`
//   );


let years=  [0,1,2]
let depts  =["NATS"]
let faculties = ["SC"]
let credits=[1,1.5,2,3,4,6,9]
let terms=["F",'W',"Y"]
let types=["LECT","ONCA"]
//          const courses5 = await prisma.course.findMany({
//                         where: {
//                             deptAcronym: { in: depts },
//                         },
//                         include: {
//                             courseOfferings: true,
//                         },
//                     });
                    
// console.log(courses5)
const offerings = await prisma.currentCourseOfferings.findMany({
  where: {
    course: {
      deptAcronym: "CHEM",
    },
  },
  include: {
    course: true,        // include course info
    instructors: true,   // include instructor offerings if you want them
  },
});
console.log(offerings)
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
