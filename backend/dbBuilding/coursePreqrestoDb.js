import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';  // Importing fs.promises for reading files
import { PrismaClient } from '../generated/prisma/index.js';
import { franc } from 'franc';

const prisma = new PrismaClient();

// Current file and directory paths in ES Module scope
const __filename = fileURLToPath(import.meta.url);
console.log(`${__filename} FILENAME`)

const __dirname = path.dirname(__filename);
console.log(`${__dirname} DIRNAME`)

// Course data directory
const filePath = path.join(__dirname, '../data/all_courses.json');


async function main() {
    console.log(filePath)

   try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent)
    for (let course of data){
        console.log(`Course ${course.dept} ${course.code}`)
        const courseDB = await prisma.course.findUnique({
            where:{
                faculty_deptAcronym_courseCode_credit:{
                    faculty: course.facultyPrefix,
                    deptAcronym: course.dept,
                    courseCode: course.code,
                    credit: course.credit,
                }

            }
        })
        // console.log(courseDB)
        for (let preqreq of course.prereqs){
            // console.log(preqreq)
                let prereqInDb = await prisma.course.findUnique({
                    where:{
                        faculty_deptAcronym_courseCode_credit:{
                            faculty: preqreq.faculty,
                            deptAcronym: preqreq.dept,
                            courseCode: preqreq.code,
                            credit: preqreq.credits,
                }
                    }
                })
            console.log(preqreq)
            console.log(prereqInDb)
            if (!prereqInDb){
                prereqInDb = await prisma.course.create({
                    data:{
                        faculty: preqreq.faculty,
                        deptAcronym: preqreq.dept,
                        courseCode: preqreq.code,
                        credit: preqreq.credits,
                        year: parseInt(preqreq.code[0],10)
                    }
                })
            }
            console.log(prereqInDb)
            const createCoursePrereqInDb = await prisma.CoursePrerequisite.create({
                data:{
                    courseId: courseDB.id,
                    prereqId: prereqInDb.id,
                }
            })
            console.log(createCoursePrereqInDb)
        }
    }
}
catch(err){
    console.log(err)
}
//     const files = await fs.readdir(coursesDir);  // Read all files in the course directory
//     for (let file of files) {
//       if (path.extname(file) === '.json') {  // Only process JSON files
//         const filePath = path.join(coursesDir, file);

//         // Read the JSON file using fs.promises.readFile and parse it
//         const fileContent = await fs.readFile(filePath, 'utf-8');
//         const data = JSON.parse(fileContent);  // Parse the JSON content

//         // Iterate over courses in the JSON data
//         for (let course of data) {
//           const faculty = course.facultyPrefix;
//           const deptAcronym = course.dept;
//           const courseCode = course.code;
//           const credit = course.credit;
//           const name = course.title;
//           const desc = course.description;
//           const language = course.language;
//           const year =  parseInt(course.code[0],10)
//           const courseCreation = await prisma.Course.create({
//             data: {
//               faculty: faculty,
//               deptAcronym: deptAcronym,
//               courseCode: courseCode,
//               credit: credit,
//               name: name,
//               desc: desc,
//               language: language,
//               year:year
//             },
//           });

//           console.log("Complete");
//           console.log(courseCreation);
//         }
//       }
//     }
//   } catch (err) {
//     console.error('Error while processing courses:', err);
//   }
}

// Run main function and handle disconnect from Prisma
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
