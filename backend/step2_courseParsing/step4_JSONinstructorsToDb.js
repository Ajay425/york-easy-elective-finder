import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

// ✅ Setup paths in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Path to your single JSON file (adjust file name here)
const filePath = path.join(__dirname, '../data/all_courses.json');
console.log(filePath)


async function main() {
  const teachingTypes = ["LECT", "SEMR", "BLEN", "ONLN", "ONCA", "HYFX"];

  try {
    // Read and parse the JSON file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent); // Expected to be an array like [{ faculty, name, url }]
        
    

    for (let course of data) {


      for (let term of course.terms){

        for (let meeting of term.meetings){

            const sanitizedType = meeting.type.replace(/[^A-Za-z]/g, '').toUpperCase();

            //Only teaching instructors are put in the database, removing lab and otherwise.
            if (teachingTypes.includes(sanitizedType)){

              for (let instr of meeting.instructors){
                  console.log(`${instr.firstName} ${instr.lastName}`)

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

                  console.log("SUCCESS " , upsertProf);
              }
            }
        }
      }
    

}
    console.log('🎉 All profs inserted successfully!');
  } catch (err) {
    console.error('❌ Error while processing profs:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
