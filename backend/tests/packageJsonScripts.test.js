import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJsonPath = new URL('../package.json', import.meta.url);
const rawPackageJson = fs.readFileSync(packageJsonPath, 'utf8');

for (const marker of ['<<<<<<<', '=======', '>>>>>>>']) {
  assert.equal(
    rawPackageJson.includes(marker),
    false,
    `backend/package.json should not contain merge-conflict marker ${marker}`
  );
}

const packageJson = JSON.parse(rawPackageJson);

assert.equal(
  packageJson.scripts['fetch:seats'],
  'node scripts/fetchSeats.js',
  'backend/package.json should expose the fetch:seats script used by the workflow'
);
assert.match(
  packageJson.scripts.test,
  /\bparsePrereqs\.test\.js\b/,
  'backend/package.json should keep parsePrereqs coverage in the test script'
);
assert.match(
  packageJson.scripts.test,
  /\bmergePreviousCourses\.test\.js\b/,
  'backend/package.json should keep mergePreviousCourses coverage in the test script'
);

console.log('packageJsonScripts.test.js passed: backend/package.json scripts are valid');
