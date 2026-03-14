import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';  // Importing fs.promises for reading files
import { PrismaClient } from '@prisma/client';

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
        if (!courseDB) continue;
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
            await prisma.coursePrerequisite.upsert({
                where: {
                    courseId_prereqId: {
                        courseId: courseDB.id,
                        prereqId: prereqInDb.id,
                    },
                },
                update: {},
                create: {
                    courseId: courseDB.id,
                    prereqId: prereqInDb.id,
                },
            })
        }
    }
}
catch(err){
    console.log(err)
    throw err;
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
