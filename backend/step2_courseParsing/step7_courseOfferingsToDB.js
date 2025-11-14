import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';  // Importing fs.promises for reading files
import { PrismaClient } from '../generated/prisma/index.js';

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
    const teachingTypes = ["LECT", "SEMR", "BLEN", "ONLN", "ONCA", "HYFX"];

   try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent)
    for (let course of data){
        console.log(`Course ${course.dept} ${course.code}`)

        for (let terms of course.terms){
          for (let meeting of terms.meetings){
            const sanitizedType = meeting.type.replace(/[^A-Za-z]/g, '').toUpperCase();
            if (teachingTypes.includes(sanitizedType)){
                    console.log(`${terms.term} ${course.facultyPrefix} ${course.dept} ${course.code} ${terms.section} ${sanitizedType} `)
                // assume prisma is your PrismaClient and variables are defined:
                // course.facultyPrefix, course.dept, course.code, course.credit
                // terms.term, terms.section, sanitizedType

                // 1) find the Course by your compound unique
                const courseRecord = await prisma.course.findUnique({
                where: {
                    faculty_deptAcronym_courseCode_credit: {
                    faculty: course.facultyPrefix,
                    deptAcronym: course.dept,
                    courseCode: course.code,
                    credit: course.credit,
                    },
                },
                });

                if (!courseRecord) {
                throw new Error(`Course not found for ${course.dept} ${course.code} (${course.credit})`);
                }

                // 2) upsert the CurrentCourseOfferings
                const offering = await prisma.currentCourseOfferings.upsert({
                where: {
                    // Prisma uses underscore-joined name for composite unique inputs
                    term_courseId_section_type: {
                    term: terms.term,
                    courseId: courseRecord.id,
                    section: terms.section,
                    type: sanitizedType,
                    },
                },
                update: {}, // empty -> do nothing if already exists
                create: {
                    term: terms.term,
                    courseId: courseRecord.id,
                    section: terms.section,
                    type: sanitizedType,
                },
                });

                console.log('Upserted offering id:', offering.id);


            }
          
                // for (let instructor of meeting.instructors){
                //     console.log(instructor)
    
                // }
          }
        }
    }
}
catch(err){
    console.log(err)
}

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
