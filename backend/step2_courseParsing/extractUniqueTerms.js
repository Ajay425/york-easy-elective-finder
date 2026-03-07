import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient();

async function extractUniqueTerms() {
  try {
    // Fetch all course offerings
    const offerings = await prisma.currentCourseOfferings.findMany({
      select: {
        term: true,
      },
      distinct: ['term'], // Get only unique terms
    });

    // Extract unique term names
    const uniqueTerms = offerings.map(o => o.term).sort();

    console.log('📋 Unique Terms Found:');
    console.log(uniqueTerms);
    console.log(`\n✅ Total unique terms: ${uniqueTerms.length}`);

    // Save to a JSON file for reference
    const fs = await import('fs');
    fs.writeFileSync(
      './uniqueTerms.json',
      JSON.stringify(uniqueTerms, null, 2),
      'utf-8'
    );
    console.log('💾 Saved to: uniqueTerms.json');

  } catch (error) {
    console.error('❌ Error fetching terms:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extractUniqueTerms();
