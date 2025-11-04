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

const lecturetypes = new Set()

async function main() {
  try {
    // Read and parse the JSON file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent); // Expected to be an array like [{ faculty, name, url }]

    for (let course of data) {


      for (let term of course.terms){

        for (let meeting of term.meetings){

            lecturetypes.add(meeting.type)
            for (let instr of meeting.instructors){
                console.log(`${instr.firstName} ${instr.lastName}`)

                // const upsertProf = await prisma.professor.upsert({
                //     where: {
                //         firstname_lastname: {   // 👈 note the exact name format
                //         firstname:instr.firstName,
                //         lastname:instr.lastName
                //         }
                //     },
                //     update: {},
                //     create: {
                //         firstname:instr.firstName,
                //         lastname:instr.lastName
                //     }
                //     });

                // console.log(upsertProf)
            }
        }
      }

    //   // Insert into Prisma
    //   const facultyCreation = await prisma.faculty.create({
    //     data: {
    //       acronym: acronym,
    //       longForm: longForm,
    //       url: url,
    //     },
    //   });

    //   console.log(facultyCreation);
    

}
    console.log(lecturetypes)
    console.log('🎉 All faculties inserted successfully!');
  } catch (err) {
    console.error('❌ Error while processing faculties:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
