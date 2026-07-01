import { artifactPaths, collectCoursePrereqs, loadAllCourses, writeJsonArtifact } from './jsonPipelineArtifacts.js';

const courses = await loadAllCourses();
const prereqs = collectCoursePrereqs(courses);

await writeJsonArtifact(artifactPaths.step12CoursePrereqs, {
  generatedAt: new Date().toISOString(),
  source: 'step2_courseParsing/all_courses.json',
  totalCourses: prereqs.length,
  courses: prereqs,
});

console.log(`[step12-json] Wrote ${prereqs.length} prerequisite course rows to ${artifactPaths.step12CoursePrereqs}`);