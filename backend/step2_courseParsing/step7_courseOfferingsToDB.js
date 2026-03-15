import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';  // Importing fs.promises for reading files
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PROGRESS_EVERY = 100;

// Current file and directory paths in ES Module scope
const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

// Course data directory
const filePath = path.join(__dirname, 'all_courses.json');


async function main() {
    const teachingTypes = ["LECT", "SEMR", "BLEN", "ONLN", "ONCA", "HYFX"];
        const stats = {
            coursesScanned: 0,
            teachingMeetingsScanned: 0,
            offeringsUpserted: 0,
            missingCourseRows: 0,
        };

   try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent)
        for (let i = 0; i < data.length; i++) {
                const course = data[i];
                stats.coursesScanned++;

                for (const terms of course.terms){
                    for (const meeting of terms.meetings){
            const sanitizedType = meeting.type.replace(/[^A-Za-z]/g, '').toUpperCase();
            if (teachingTypes.includes(sanitizedType)){
                                stats.teachingMeetingsScanned++;
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
                stats.missingCourseRows++;
                continue;
                }

                // 2) upsert the CurrentCourseOfferings
                const termAndYear = course.termAndYear ?? `${terms.term}`;

                const offering = await prisma.currentCourseOfferings.upsert({
                where: {
                    // Prisma uses underscore-joined name for composite unique inputs
                    termAndYear_courseId_section_type: {
                    termAndYear,
                    courseId: courseRecord.id,
                    section: terms.section,
                    type: sanitizedType,
                    },
                },
                update: {
                    term: terms.term,
                    termAndYear,
                    courseId: courseRecord.id,
                    section: terms.section,
                    type: sanitizedType,
                    catNumber: meeting.catNumber

                }, // empty -> do nothing if already exists
                create: {
                    term: terms.term,
                    termAndYear,
                    courseId: courseRecord.id,
                    section: terms.section,
                    type: sanitizedType,
                    catNumber: meeting.catNumber

                },
                });

                if (offering) stats.offeringsUpserted++;


            }
          
                // for (let instructor of meeting.instructors){
                //     console.log(instructor)
    
                // }
          }
        }

                if (
                    stats.coursesScanned === 1 ||
                    stats.coursesScanned % PROGRESS_EVERY === 0 ||
                    stats.coursesScanned === data.length
                ) {
                    console.log(
                        `[step7] Progress ${stats.coursesScanned}/${data.length} | teachingMeetings=${stats.teachingMeetingsScanned} offeringsUpserted=${stats.offeringsUpserted} missingCourses=${stats.missingCourseRows}`
                    );
                }
    }

        console.log(`[step7] Summary: ${JSON.stringify(stats)}`);
}
catch(err){
        console.error(err)
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
