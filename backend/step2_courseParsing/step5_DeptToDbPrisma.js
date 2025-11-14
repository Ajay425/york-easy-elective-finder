//Put dept into prisma, based on folder names . I.e "ENG - Engineering - ( GS, LE )" gets dept ENG and longform Engineering
import fs from "fs";
import path from "path";
import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

// Path where your folders are located
const baseDir = path.resolve(
  "../../step1_PythonCourseScraper/york_courses"
);

// Regex pattern to extract parts like "ENG - Engineering - ( GS, LE )"
const folderPattern = /^([A-Z&]+)\s*-\s*(.*?)\s*-\s*\(.*\)$/;

async function main() {
  try {
    const folders = fs.readdirSync(baseDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`📁 Found ${folders.length} department folders`);

    for (const folder of folders) {
      const match = folder.match(folderPattern);
      if (!match) {
        console.warn(`⚠️ Could not parse folder name: ${folder}`);
        continue;
      }

      const [_, deptAcronym, deptFull] = match;

      console.log(`➡️ Inserting: ${deptAcronym} — ${deptFull}`);

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
      } catch (err) {
        console.error(`❌ Failed to insert ${deptAcronym}: ${err.message}`);
      }
    }

    console.log("✅ Done inserting departments.");
  } catch (err) {
    console.error("❌ Error scanning folders:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
