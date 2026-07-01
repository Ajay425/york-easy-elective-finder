import { artifactPaths, collectDepartments, loadAllCourses, writeJsonArtifact } from './jsonPipelineArtifacts.js';

const courses = await loadAllCourses();
const departments = collectDepartments(courses);

await writeJsonArtifact(artifactPaths.step5Departments, {
  generatedAt: new Date().toISOString(),
  source: 'step2_courseParsing/all_courses.json',
  ...departments,
});

console.log(`[step5-json] Wrote ${departments.faculties.length} faculty rows and ${departments.departments.length} department rows to ${artifactPaths.step5Departments}`);