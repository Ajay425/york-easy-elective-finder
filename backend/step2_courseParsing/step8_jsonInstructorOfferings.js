import { artifactPaths, collectInstructorOfferings, loadAllCourses, writeJsonArtifact } from './jsonPipelineArtifacts.js';

const courses = await loadAllCourses();
const instructorOfferings = collectInstructorOfferings(courses);

await writeJsonArtifact(artifactPaths.step8InstructorOfferings, {
  generatedAt: new Date().toISOString(),
  source: 'step2_courseParsing/all_courses.json',
  totalRows: instructorOfferings.length,
  instructorOfferings,
});

console.log(`[step8-json] Wrote ${instructorOfferings.length} instructor-offering rows to ${artifactPaths.step8InstructorOfferings}`);