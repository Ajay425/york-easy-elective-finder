//Put dept into prisma, based on folder names . I.e "ENG - Engineering - ( GS, LE )" gets dept ENG and longform Engineering
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path where your folders are located
const baseDir = path.resolve(
  __dirname,
  '../step1_PythonCourseScraper/york_courses'
);

// Regex pattern to extract parts like "ENG - Engineering - ( GS, LE )"
const folderPattern = /^([A-Z&]+)\s*-\s*(.*?)\s*-\s*\(.*\)$/;

async function main() {
  const stats = {
    foldersFound: 0,
    foldersParsed: 0,
    departmentsUpserted: 0,
    parseSkipped: 0,
    upsertErrors: 0,
  };

  try {
    const folders = fs.readdirSync(baseDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    stats.foldersFound = folders.length;
    console.log(`[step5] Found ${folders.length} department folders.`);

    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i];
      const match = folder.match(folderPattern);
      if (!match) {
        console.warn(`⚠️ Could not parse folder name: ${folder}`);
        stats.parseSkipped++;
        continue;
      }
      stats.foldersParsed++;

      const [_, deptAcronym, deptFull] = match;

      try {
        
        //Try to insert dept
        await prisma.department.upsert({
          where:{
            acronym: deptAcronym
          },
          update:{
          },
            
          create:{
           
                
                     acronym: deptAcronym, 
                    longForm: deptFull
                
          }

        });
        stats.departmentsUpserted++;
      } catch (err) {
        stats.upsertErrors++;
        console.error(`❌ Failed to insert ${deptAcronym}: ${err.message}`);
      }

      const processed = i + 1;
      if (processed === 1 || processed % 50 === 0 || processed === folders.length) {
        console.log(
          `[step5] Progress ${processed}/${folders.length} | upserted=${stats.departmentsUpserted} parseSkipped=${stats.parseSkipped} errors=${stats.upsertErrors}`
        );
      }
    }

    console.log(`[step5] Summary: ${JSON.stringify(stats)}`);
  } catch (err) {
    console.error("❌ Error scanning folders:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
