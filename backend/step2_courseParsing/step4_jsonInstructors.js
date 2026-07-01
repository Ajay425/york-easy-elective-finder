import { artifactPaths, collectInstructors, loadAllCourses, writeJsonArtifact } from './jsonPipelineArtifacts.js';

const courses = await loadAllCourses();
const instructors = collectInstructors(courses);

await writeJsonArtifact(artifactPaths.step4Instructors, {
  generatedAt: new Date().toISOString(),
  source: 'step2_courseParsing/all_courses.json',
  totalInstructors: instructors.length,
  instructors,
});

console.log(`[step4-json] Wrote ${instructors.length} instructor rows to ${artifactPaths.step4Instructors}`);