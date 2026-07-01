import { artifactPaths, collectCourseOfferings, loadAllCourses, writeJsonArtifact } from './jsonPipelineArtifacts.js';

const courses = await loadAllCourses();
const offerings = collectCourseOfferings(courses);

await writeJsonArtifact(artifactPaths.step7Offerings, {
  generatedAt: new Date().toISOString(),
  source: 'step2_courseParsing/all_courses.json',
  totalOfferings: offerings.length,
  offerings,
});

console.log(`[step7-json] Wrote ${offerings.length} course offering rows to ${artifactPaths.step7Offerings}`);