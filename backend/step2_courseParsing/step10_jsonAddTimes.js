import fs from 'fs/promises';
import path from 'path';
import { artifactPaths, serializeCourseTimesLookup } from './jsonPipelineArtifacts.js';
import { buildCourseTimesLookup } from '../scripts/exportStaticFrontendData.js';

const courseTimes = await buildCourseTimesLookup();
const serialized = {
  generatedAt: new Date().toISOString(),
  source: 'step2_courseParsing/courseTimesHtml/*.html',
  ...serializeCourseTimesLookup(courseTimes),
};

await fs.mkdir(path.dirname(artifactPaths.step10CourseTimes), { recursive: true });
await fs.writeFile(artifactPaths.step10CourseTimes, `${JSON.stringify(serialized, null, 2)}\n`, 'utf8');

console.log(`[step10-json] Wrote course-time lookup to ${artifactPaths.step10CourseTimes}`);