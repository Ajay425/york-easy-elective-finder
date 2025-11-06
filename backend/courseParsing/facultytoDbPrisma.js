import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

// ✅ Setup paths in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Path to your single JSON file (adjust file name here)
const filePath = path.join(__dirname, '../data/facultyAbbreviations.json');
console.log(filePath)
async function main() {
  try {
    // Read and parse the JSON file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent); // Expected to be an array like [{ faculty, name, url }]

    for (let faculty of data) {
      const acronym = faculty.faculty;     // or faculty.acronym, depending on JSON keys
      const longForm = faculty.name;
      const url = faculty.url;

      // Insert into Prisma
      const facultyCreation = await prisma.faculty.create({
        data: {
          acronym: acronym,
          longForm: longForm,
          url: url,
        },
      });

      console.log(facultyCreation);
    }

    console.log('🎉 All faculties inserted successfully!');
  } catch (err) {
    console.error('❌ Error while processing faculties:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
