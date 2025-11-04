import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient()

async function main() {
        const result = await prisma.Course.groupBy({
            by:'faculty'

        })
//   console.log(result);

        const result2 = await prisma.Course.groupBy({
            by:'deptAcronym',
            _count: {
                deptAcronym: true,
            },

        })

  console.dir(result2, { depth: null });

        const result3 = await prisma.Department.findMany({

        })
        
  console.dir(result3, { depth: null });

          const result4 = await prisma.faculty.findMany({

        })
        
  console.dir(result4, { depth: null });
}
main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })