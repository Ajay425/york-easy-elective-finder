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
    console.log(filePath)

   try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent)
    for (let course of data){
        console.log(`Course ${course.dept} ${course.code}`)

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
            console.log(courseRow.id)
        for (let terms of course.terms){
            //     console.log(terms.term)
            // console.log(terms.section)
        const teachingTypes = ["LECT", "SEMR", "BLEN", "ONLN", "ONCA", "HYFX"];
          for (let meeting of terms.meetings){
            // console.log(meeting.type)
            const sanitizedType = meeting.type.replace(/[^A-Za-z]/g, '').toUpperCase();
            if (teachingTypes.includes(sanitizedType)){
      
                    
                    console.log(`${terms.term} ${course.facultyPrefix} ${course.dept} ${course.code} ${terms.section} ${sanitizedType} `)
                    
                    const courseOfferingId = await prisma.CurrentCourseOfferings.findUnique({
                        where:{
                            term_courseId_section_type:{
                                    term: terms.term,
                                    courseId : courseRow.id,
                                    section: terms.section,
                                    type: sanitizedType,

                            }
  
                    },
                    select:{
                        id:true
                    }
                })


                for (let instructor of meeting.instructors){
                    const instructorPRISMA = await prisma.Instructors.findUnique({
                        where:{
                                firstname_lastname:{
                                    firstname:instructor.firstName,
                                    lastname:instructor.lastName
                                }
                            }
                    })
                    console.log(instructorPRISMA)

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

                        console.log('Upserted instructorOffering id:', instructorOffering.id);
                        } catch (err) {
                        console.error('Failed to upsert instructorOffering:', err);
                        throw err;
                        }
                }
            }
          }
        }
    }
}
catch(err){
    console.log(err)
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
