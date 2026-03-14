// scripts/cleanupSelfPrereqs.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.$executeRawUnsafe(
    `DELETE FROM "CoursePrerequisite" WHERE "courseId" = "prereqId";`
  );
  console.log(`Deleted ${deleted} self-referential prereq rows.`);
}

main().finally(() => prisma.$disconnect());
