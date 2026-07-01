import { artifactPaths, collectCourseSnapshots, loadAllCourses, writeJsonArtifact } from './jsonPipelineArtifacts.js';

const courses = await loadAllCourses();
const snapshot = collectCourseSnapshots(courses);

await writeJsonArtifact(artifactPaths.step2Courses, {
  generatedAt: new Date().toISOString(),
  source: 'step2_courseParsing/all_courses.json',
  totalCourses: snapshot.length,
  courses: snapshot,
});

console.log(`[step2-json] Wrote ${snapshot.length} normalized course rows to ${artifactPaths.step2Courses}`);