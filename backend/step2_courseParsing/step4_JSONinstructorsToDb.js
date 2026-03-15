import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ✅ Setup paths in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Path to your single JSON file (adjust file name here)
const filePath = path.join(__dirname, 'all_courses.json');
const PROGRESS_EVERY = 500;


async function main() {
  const teachingTypes = ["LECT", "SEMR", "BLEN", "ONLN", "ONCA", "HYFX"];
  const stats = {
    coursesScanned: 0,
    teachingMeetingsScanned: 0,
    instructorsSeen: 0,
    instructorsUpserted: 0,
  };

  try {
    // Read and parse the JSON file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent); // Expected to be an array like [{ faculty, name, url }]
        
    

    for (const course of data) {
      stats.coursesScanned++;


      for (const term of course.terms){

        for (const meeting of term.meetings){

            const sanitizedType = meeting.type.replace(/[^A-Za-z]/g, '').toUpperCase();

            //Only teaching instructors are put in the database, removing lab and otherwise.
            if (teachingTypes.includes(sanitizedType)){
              stats.teachingMeetingsScanned++;

              for (const instr of meeting.instructors){
                  stats.instructorsSeen++;

                  const upsertProf = await prisma.instructors.upsert({
                      where: {
                          firstname_lastname: {   // 👈 note the exact name format
                          firstname:instr.firstName,
                          lastname:instr.lastName
                          }
                      },
                      update: {},
                      create: {
                          firstname:instr.firstName,
                          lastname:instr.lastName
                      }
                      });
                  if (upsertProf) stats.instructorsUpserted++;

                  if (
                    stats.instructorsSeen === 1 ||
                    stats.instructorsSeen % PROGRESS_EVERY === 0
                  ) {
                    console.log(
                      `[step4] Progress instructors=${stats.instructorsSeen} upserts=${stats.instructorsUpserted}`
                    );
                  }
              }
            }
        }
      }
    

}
    console.log(`[step4] Summary: ${JSON.stringify(stats)}`);
  } catch (err) {
    console.error('❌ Error while processing profs:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
