import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Array of steps to execute in order. The default pipeline is now JSON-only:
// the scraper writes course JSON, the numbered pipeline rewrites JSON artifacts,
// and the static export consumes those JSON artifacts directly.
const steps = [
  { num: 1, name: 'Extract Courses from HTML', path: './step1_extractAllCoursestoJson.js' },
  { num: 1.5, name: 'Update Lecture Category Numbers', path: './step1.5_updateCatNumbers.js' },
  { num: 2, name: 'Normalize Courses (JSON)', path: './step2_jsonCourses.js' },
  { num: 3, name: 'Build Prerequisite Edges (JSON)', path: './step3_jsonPrereqs.js' },
  { num: 4, name: 'Build Instructor Roster (JSON)', path: './step4_jsonInstructors.js' },
  { num: 5, name: 'Build Department Snapshot (JSON)', path: './step5_jsonDepartments.js' },
  { num: 6, name: 'Refresh RMP Ratings (JSON/API)', path: './step6_rmpAddprofessorRatingsJson.js' },
  { num: 7, name: 'Build Course Offerings (JSON)', path: './step7_jsonCourseOfferings.js' },
  { num: 8, name: 'Build Instructor-Offering Links (JSON)', path: './step8_jsonInstructorOfferings.js' },
  { num: 9, name: 'Compute Instructor Popularity (JSON)', path: './step9_jsonInstructorPopularity.js' },
  { num: 10, name: 'Build Course Times (JSON)', path: './step10_jsonAddTimes.js' },
  { num: 11, name: 'Cleanup Self Prerequisites (JSON)', path: './step11_cleanupSelfPrereqsJson.js' },
  { num: 13, name: 'Remove Prereqs From Approved Course List (JSON)', path: './step13_removeApprovedCoursePrereqsJson.js' },
  { num: 12, name: 'Build Course Prerequisite Snapshot (JSON)', path: './step12_jsonCoursePrereqs.js' },
  { num: 14, name: 'Extract Unique Values (JSON)', path: './step14_uniqueValuesJson.js' },
];

const legacyCoverageNotes = [
  'Steps 2, 3, 4, 5, 7, 8, and 12 now build JSON snapshots instead of Prisma tables.',
  'Steps 6 and 9 refresh RMP ratings and popularity in JSON files using the live RMP API and JSON outputs.',
  'Step 10 builds a JSON course-time lookup from step2_courseParsing/courseTimesHtml/*.html.',
  'Steps 11, 13, and 14 continue to rewrite derived JSON in place.',
];

function logLegacyCoverage() {
  console.log('Legacy step coverage:');
  for (const note of legacyCoverageNotes) {
    console.log(`- ${note}`);
  }
  console.log('');
}

async function runStep(stepNumber, stepName, modulePath, progressIndex) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`▶️  Step ${progressIndex}/${steps.length}: ${stepName}`);
    console.log(`${'='.repeat(60)}`);
    
    const stepStartTime = Date.now();
    
    // Spawn the module in a child process to ensure it runs to completion
    // This allows async operations like API calls to complete
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const child = spawn('node', [modulePath], {
        stdio: 'inherit',
        cwd: __dirname
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Step exited with code ${code}`));
        } else {
          const stepDuration = ((Date.now() - stepStartTime) / 1000).toFixed(2);
          console.log(`✅ Step ${progressIndex}/${steps.length} completed in ${stepDuration}s\n`);
          resolve();
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error(`\n❌ Step ${progressIndex}/${steps.length} (${stepName}) failed:`);
    console.error(error.message);
    throw error;
  }
}

async function archiveAllCourses() {
  const src = path.join(__dirname, 'all_courses.json');
  const archiveDir = path.join(__dirname, 'archive');

  try {
    await fs.mkdir(archiveDir, { recursive: true });

    let termAndYear;
    const sessionMetaPath = path.join(__dirname, '../step1_PythonCourseScraper/session_meta.json');
    try {
      const meta = JSON.parse(await fs.readFile(sessionMetaPath, 'utf-8'));
      termAndYear = meta?.termAndYear;
    } catch {
      // ignore
    }

    if (!termAndYear) {
      try {
        const allCourses = JSON.parse(await fs.readFile(src, 'utf-8'));
        if (Array.isArray(allCourses) && allCourses.length > 0) {
          termAndYear = allCourses[0].termAndYear;
        }
      } catch {
        // ignore
      }
    }

    const safeTerm = (termAndYear ? String(termAndYear) : 'unknown')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(archiveDir, `all_courses_${safeTerm}_${timestamp}.json`);

    await fs.rename(src, dest);
    console.log(`📦 Archived all_courses.json → ${dest}`);
  } catch (err) {
    console.warn(`⚠️ Failed to archive all_courses.json: ${err.message}`);
  }
}

async function main() {
  const pipelineStart = Date.now();
  
  console.log('\n' + '█'.repeat(60));
  console.log('█ JSON COURSE PIPELINE - STARTING');
  console.log('█'.repeat(60));
  console.log(`Total steps: ${steps.length}`);
  console.log(`Started at: ${new Date().toLocaleString()}\n`);
  logLegacyCoverage();
  
  let completedSteps = 0;
  let success = false;
  
  try {
    for (const [index, step] of steps.entries()) {
      await runStep(step.num, step.name, step.path, index + 1);
      completedSteps++;
    }
    
    const totalDuration = ((Date.now() - pipelineStart) / 1000).toFixed(2);
    
    console.log('\n' + '█'.repeat(60));
    console.log('█ ✅ PIPELINE COMPLETED SUCCESSFULLY');
    console.log('█'.repeat(60));
    console.log(`Total time: ${totalDuration}s`);
    console.log(`Completed at: ${new Date().toLocaleString()}`);
    console.log('█'.repeat(60) + '\n');
    
    success = true;
  } catch (error) {
    console.error('\n' + '█'.repeat(60));
    console.error('█ ❌ PIPELINE FAILED');
    console.error('█'.repeat(60));
    console.error(`Completed ${completedSteps}/${steps.length} steps`);
    console.error(`Failed at step: ${completedSteps + 1}`);
    console.error('█'.repeat(60) + '\n');
  } finally {
    if (success) {
      await archiveAllCourses();
    }
    process.exit(success ? 0 : 1);
  }
}

main();
