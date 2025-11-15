import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the single JSON file
const allCoursesPath = path.join(__dirname, 'all_courses.json');

async function main() {
  const failedUpserts = [];

  try {
    // Load only all_courses.json
    const fileContent = await fs.readFile(allCoursesPath, 'utf-8');
    const data = JSON.parse(fileContent);

    for (let course of data) {
      
      const faculty = course.facultyPrefix;
      const deptAcronym = course.dept;
      const courseCode = course.code;
      const credit = course.credit;
      const name = course.title;
      const desc = course.description;
      const language = course.language;
      const year = parseInt(course.code[0], 10);


      try {
        // MUST await or your try/catch won't catch errors
        await prisma.course.upsert({
          where: {
            faculty_deptAcronym_courseCode_credit: {
              faculty,
              deptAcronym,
              courseCode,
              credit,
            },
          },
          update: {
            name,
            desc,
            language,
            year,
          },
          create: {
            faculty,
            deptAcronym,
            courseCode,
            credit,
            name,
            desc,
            language,
            year,
          },
        });
      } catch (error) {
        console.log("failed")
        failedUpserts.push({
          faculty,
          deptAcronym,
          courseCode,
          credit,
          name,
          error: error.message,
        });
      }
    }

    console.log("Completed course insert");

    // Save failed upserts to file
    const failedPath = path.join(__dirname, 'failed_upserts.json');
    await fs.writeFile(failedPath, JSON.stringify(failedUpserts, null, 2));

    console.log(`Failed upserts saved to ${failedPath}`);

  } catch (err) {
    console.error('Error while processing courses:', err);
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
