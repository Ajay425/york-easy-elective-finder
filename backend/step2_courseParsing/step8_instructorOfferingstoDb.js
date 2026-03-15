import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';  // Importing fs.promises for reading files
import { PrismaClient } from '@prisma/client';
import { connect } from 'http2';

const prisma = new PrismaClient();

// Current file and directory paths in ES Module scope
// ✅ Setup paths in ES module scope
// ✅ Setup paths in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Path to your single JSON file (adjust file name here)
const filePath = path.join(__dirname, 'all_courses.json');
const PROGRESS_EVERY = 100;


async function main() {
        const stats = {
            coursesScanned: 0,
            teachingMeetingsScanned: 0,
            instructorPairsProcessed: 0,
            instructorOfferingsUpserted: 0,
            missingCourses: 0,
            missingOfferings: 0,
            missingInstructors: 0,
        };

   try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent)

        for (let i = 0; i < data.length; i++) {
                const course = data[i];
                stats.coursesScanned++;

        const courseRow = await prisma.course.findUnique({
                where: {
                    faculty_deptAcronym_courseCode_credit: {
                    faculty: course.facultyPrefix,
                    deptAcronym: course.dept,
                    courseCode: course.code,
                    credit: course.credit,
                    },
                },
                select: { id: true },
                });
                        if (!courseRow) {
                            stats.missingCourses++;
                            continue;
                        }
                for (const terms of course.terms){
            //     console.log(terms.term)
            // console.log(terms.section)
        const teachingTypes = ["LECT", "SEMR", "BLEN", "ONLN", "ONCA", "HYFX"];
                    for (const meeting of terms.meetings){
            // console.log(meeting.type)
            const sanitizedType = meeting.type.replace(/[^A-Za-z]/g, '').toUpperCase();
            if (teachingTypes.includes(sanitizedType)){
                                        stats.teachingMeetingsScanned++;
      
                    
                    const termAndYear = course.termAndYear ?? `${terms.term}`;
                    
                    const courseOfferingId = await prisma.CurrentCourseOfferings.findUnique({
                        where:{
                            termAndYear_courseId_section_type:{
                                    termAndYear,
                                    courseId : courseRow.id,
                                    section: terms.section,
                                    type: sanitizedType,

                            }
  
                    },
                    select:{
                        id:true
                    }
                })

                if (!courseOfferingId) {
                  stats.missingOfferings++;
                  continue;
                }


                for (const instructor of meeting.instructors){
                    stats.instructorPairsProcessed++;
                    const instructorPRISMA = await prisma.Instructors.findUnique({
                        where:{
                                firstname_lastname:{
                                    firstname:instructor.firstName,
                                    lastname:instructor.lastName
                                }
                            }
                    })

                                        if (!instructorPRISMA) {
                                            stats.missingInstructors++;
                                            continue;
                                        }

                    const isntrID= instructorPRISMA.id
                    
                   try {
                        const instructorOffering = await prisma.instructorOfferings.upsert({
                            where: {
                            instructorId_courseOfferingId: {
                                instructorId: isntrID,
                                courseOfferingId: courseOfferingId.id,
                            },
                            },
                            update: {}, // empty => do NOTHING if already exists
                            create: {
                            instructorId: isntrID,
                            courseOfferingId: courseOfferingId.id,
                            },
                        });

                        if (instructorOffering) stats.instructorOfferingsUpserted++;
                        } catch (err) {
                        console.error('Failed to upsert instructorOffering:', err);
                        throw err;
                        }
                }
            }
          }
        }

                if (
                    stats.coursesScanned === 1 ||
                    stats.coursesScanned % PROGRESS_EVERY === 0 ||
                    stats.coursesScanned === data.length
                ) {
                    console.log(
                        `[step8] Progress ${stats.coursesScanned}/${data.length} | meetings=${stats.teachingMeetingsScanned} pairs=${stats.instructorPairsProcessed} upserts=${stats.instructorOfferingsUpserted} missingCourses=${stats.missingCourses} missingOfferings=${stats.missingOfferings} missingInstructors=${stats.missingInstructors}`
                    );
                }
    }

        console.log(`[step8] Summary: ${JSON.stringify(stats)}`);
}
catch(err){
        console.error(err)
}
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
