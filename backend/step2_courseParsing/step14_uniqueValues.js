import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, 'step14_uniqueValues.json');
const ARCHIVE_DIR = path.join(__dirname, 'archive');

const prisma = new PrismaClient();

function previewList(values, max = 10) {
  if (!Array.isArray(values) || values.length === 0) return '(none)';
  if (values.length <= max) return values.join(', ');
  return `${values.slice(0, max).join(', ')} ... (+${values.length - max} more)`;
}

async function archivePrevious() {
  try {
    await fs.access(OUTPUT_FILE);
    // File exists — move it to archive with a timestamp
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
    const archiveName = `step14_uniqueValues_${ts}.json`;
    await fs.rename(OUTPUT_FILE, path.join(ARCHIVE_DIR, archiveName));
    console.log(`[step14] Archived previous output to archive/${archiveName}`);
  } catch {
    // No previous file to archive, continue
  }
}

async function main() {
  try {
    console.log('[step14] Querying unique values from database...');

    const [
      faculties,
      departments,
      credits,
      years,
      terms,
      termAndYears,
    ] = await Promise.all([
      prisma.course.findMany({ select: { faculty: true }, distinct: ['faculty'] }),
      prisma.course.findMany({ select: { deptAcronym: true }, distinct: ['deptAcronym'] }),
      prisma.course.findMany({ select: { credit: true }, distinct: ['credit'] }),
      prisma.course.findMany({ select: { year: true }, distinct: ['year'] }),
      prisma.currentCourseOfferings.findMany({ select: { term: true }, distinct: ['term'] }),
      prisma.currentCourseOfferings.findMany({ select: { termAndYear: true }, distinct: ['termAndYear'] }),
    ]);

    const result = {
      generatedAt: new Date().toISOString(),
      faculties: faculties.map(r => r.faculty).sort(),
      departments: departments.map(r => r.deptAcronym).sort(),
      credits: credits.map(r => r.credit).sort((a, b) => a - b),
      years: years.map(r => r.year).sort((a, b) => a - b),
      terms: terms.map(r => r.term).sort(),
      termAndYears: termAndYears.map(r => r.termAndYear).filter(Boolean).sort(),
    };

    await archivePrevious();
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');

    console.log('[step14] Unique values summary:');
    console.log(`  faculties=${result.faculties.length} | ${previewList(result.faculties)}`);
    console.log(`  departments=${result.departments.length} | ${previewList(result.departments)}`);
    console.log(`  credits=${result.credits.length} | ${previewList(result.credits)}`);
    console.log(`  years=${result.years.length} | ${previewList(result.years)}`);
    console.log(`  terms=${result.terms.length} | ${previewList(result.terms)}`);
    console.log(`  termAndYears=${result.termAndYears.length} | ${previewList(result.termAndYears)}`);
    console.log(`[step14] Saved output to ${OUTPUT_FILE}`);

  } catch (err) {
    console.error('❌ step14 failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
