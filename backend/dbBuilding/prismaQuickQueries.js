import { fileURLToPath } from 'url';
import path from 'path';
import { PrismaClient } from '../generated/prisma/index.js';
import { connect } from 'http2';
import fs from 'fs';
const prisma = new PrismaClient();

// Current file and directory paths in ES Module scope
const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

// Course data directory
const filePath = path.join(__dirname, '../data/all_courses.json');

import extractPrereqsWithCredits from "../courseParsing/parsePrereqs.js"

async function main() {


const courses6 = await prisma.course.findMany({
  where: {
    // year: 1,
    // deptAcronym:"EECS",
    prerequisites: { none: {} },
  },
})
for (let c of courses6){
  // console.log(c.desc)
  if (c.desc){
    const prereqs = extractPrereqsWithCredits(c.desc)
    if (prereqs.length > 0){
    console.log(c)

    console.log( prereqs)

    }

  }
}

// console.log(courses6)
  const jsonData = JSON.stringify(courses6, null, 2); // pretty print with 2 spaces

    // Save to file
    fs.writeFileSync('courses.json', jsonData);
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
