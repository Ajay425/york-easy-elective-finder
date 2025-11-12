import { fileURLToPath } from 'url';
import path from 'path';
import { PrismaClient } from '../generated/prisma/index.js';
import { connect } from 'http2';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  // Get unique faculties
  const uniqueFaculties = await prisma.course.findMany({
    distinct: ['faculty'],
    select: { faculty: true },
  });

  // Get unique department acronyms
  const uniqueDepts = await prisma.course.findMany({
    distinct: ['deptAcronym'],
    select: { deptAcronym: true },
  });



 // Flatten to arrays of strings and sort alphabetically
  const faculties = uniqueFaculties.map(f => f.faculty).sort();
  const departments = uniqueDepts.map(d => d.deptAcronym).sort();

  // Combine into one object
  const data = {
    faculties,
    departments,
  };

  // Write to file
  fs.writeFileSync(
    'facultiesAndDepts.json',
    JSON.stringify(data, null, 2),
    'utf-8'
  );

  console.log(
    `✅ Wrote ${faculties.length} faculties and ${departments.length} departments to facultiesAndDepts.json`
  );
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
