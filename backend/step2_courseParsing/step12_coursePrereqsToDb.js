import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';  // Importing fs.promises for reading files
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Current file and directory paths in ES Module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Course data directory
const filePath = path.join(__dirname, 'all_courses.json');
const PROGRESS_EVERY = 200;


async function main() {
    const stats = {
      coursesScanned: 0,
      coursesFoundInDb: 0,
      missingCourses: 0,
      prereqCoursesCreated: 0,
      prereqLinksUpserted: 0,
    };

   try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent)
    for (let i = 0; i < data.length; i++) {
        const course = data[i];
        stats.coursesScanned++;

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
        if (!courseDB) {
            stats.missingCourses++;
            continue;
        }
        stats.coursesFoundInDb++;
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
                stats.prereqCoursesCreated++;
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
            stats.prereqLinksUpserted++;
        }

        const processed = i + 1;
        if (processed === 1 || processed % PROGRESS_EVERY === 0 || processed === data.length) {
            console.log(
                `[step12] Progress ${processed}/${data.length} | coursesFound=${stats.coursesFoundInDb} missingCourses=${stats.missingCourses} prereqCoursesCreated=${stats.prereqCoursesCreated} prereqLinksUpserted=${stats.prereqLinksUpserted}`
            );
        }
    }

    console.log(`[step12] Summary: ${JSON.stringify(stats)}`);
}
catch(err){
    console.error(err)
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
