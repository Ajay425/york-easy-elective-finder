import { artifactPaths, collectPrereqEdges, loadAllCourses, writeJsonArtifact } from './jsonPipelineArtifacts.js';

const courses = await loadAllCourses();
const edges = collectPrereqEdges(courses);

await writeJsonArtifact(artifactPaths.step3PrereqEdges, {
  generatedAt: new Date().toISOString(),
  source: 'step2_courseParsing/all_courses.json',
  totalEdges: edges.length,
  edges,
});

console.log(`[step3-json] Wrote ${edges.length} prerequisite edge rows to ${artifactPaths.step3PrereqEdges}`);