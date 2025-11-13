// scripts/cleanupSelfPrereqs.ts
import { PrismaClient } from '../generated/prisma/index.js';
const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.$executeRawUnsafe(
    `DELETE FROM "CoursePrerequisite" WHERE "courseId" = "prereqId";`
  );
  console.log(`Deleted ${deleted} self-referential prereq rows.`);
}

main().finally(() => prisma.$disconnect());
