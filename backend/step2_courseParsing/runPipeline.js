import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Array of steps to execute in order
const steps = [
  { num: 1, name: 'Extract Courses from HTML', path: './step1_extractAllCoursestoJson.js' },
  { num: 1.5, name: 'Update Lecture Category Numbers', path: './step1.5_updateCatNumbers.js' },
  { num: 2, name: 'Import Courses to Database', path: './step2_JSONCoursestoDb.mjs' },
  { num: 3, name: 'Add Prerequisites', path: './step3_addPrereqsToCoursesInDb.js' },
  { num: 4, name: 'Import Instructors', path: './step4_JSONinstructorsToDb.js' },
  { num: 5, name: 'Import Departments', path: './step5_DeptToDbPrisma.js' },
  { num: 6, name: 'Add Professor Ratings', path: './step6_rmpAddprofessorRatingsToDb.js' },
  { num: 7, name: 'Import Course Offerings', path: './step7_courseOfferingsToDB.js' },
  { num: 8, name: 'Import Instructor Offerings', path: './step8_instructorOfferingstoDb.js' },
  { num: 9, name: 'Add Instructor Popularity', path: './step9_addInstructorPopularity.js' },
];

async function runStep(stepNumber, stepName, modulePath) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`▶️  Step ${stepNumber}/9: ${stepName}`);
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
          console.log(`✅ Step ${stepNumber} completed in ${stepDuration}s\n`);
          resolve();
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error(`\n❌ Step ${stepNumber} (${stepName}) failed:`);
    console.error(error.message);
    throw error;
  }
}

async function main() {
  const pipelineStart = Date.now();
  
  console.log('\n' + '█'.repeat(60));
  console.log('█ 🚀 DATABASE PIPELINE - STARTING');
  console.log('█'.repeat(60));
  console.log(`Total steps: ${steps.length}`);
  console.log(`Started at: ${new Date().toLocaleString()}\n`);
  
  let completedSteps = 0;
  
  try {
    for (const step of steps) {
      await runStep(step.num, step.name, step.path);
      completedSteps++;
    }
    
    const totalDuration = ((Date.now() - pipelineStart) / 1000).toFixed(2);
    
    console.log('\n' + '█'.repeat(60));
    console.log('█ ✅ PIPELINE COMPLETED SUCCESSFULLY');
    console.log('█'.repeat(60));
    console.log(`Total time: ${totalDuration}s`);
    console.log(`Completed at: ${new Date().toLocaleString()}`);
    console.log('█'.repeat(60) + '\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n' + '█'.repeat(60));
    console.error('█ ❌ PIPELINE FAILED');
    console.error('█'.repeat(60));
    console.error(`Completed ${completedSteps}/${steps.length} steps`);
    console.error(`Failed at step: ${completedSteps + 1}`);
    console.error('█'.repeat(60) + '\n');
    process.exit(1);
  }
}

main();
