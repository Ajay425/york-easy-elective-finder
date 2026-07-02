import assert from 'node:assert/strict';
import * as db from '../database/dbJsonCourses.js';

const options = await db.getCourseSearchFilterOptionsDb();
assert.ok(options.depts.includes('PSYC'), 'expected PSYC department in filter options');
assert.ok(options.terms.includes('F'), 'expected Fall term in filter options');
assert.ok(options.types.includes('LECT') || options.types.includes('ONCA'), 'expected course type filters');

const { results, total } = await db.searchCoursesDb('PSYC 1010', 1, 10, {});
assert.ok(total > 0, 'expected PSYC 1010 search results');
assert.ok(results.some((course) => course.code.includes('PSYC 1010')), 'expected PSYC 1010 in search page');

const chemSearch = await db.searchCoursesDb('CHEM 1000', 1, 10, {});
const chem1000 = chemSearch.results.find((course) => course.code === 'SC/CHEM 1000');
assert.ok(chem1000, 'expected approved no-real-prereq SC/CHEM 1000 to appear in frontend JSON search');

const hiddenSearch = await db.searchCoursesDb('ED ECON 4000', 1, 10, {});
assert.ok(
  !hiddenSearch.results.some((course) => course.code === 'ED/ECON 4000'),
  'expected manually hidden ED/ECON 4000 to be absent from frontend JSON search'
);

const course = await db.getCourseFromIdDB(results[0].id);
assert.equal(course.id, results[0].id);
assert.ok(Array.isArray(course.courseOfferings), 'expected course offerings array');
assert.ok(course.courseOfferings.length > 0, 'expected at least one offering');

const popular = await db.getPopularCoursesDb(
  ['F', 'W', 'Y'],
  options.types,
  [1, 2, 3, 4],
  options.depts,
  options.faculties,
  options.credits
);
assert.ok(popular.length > 100, 'expected broad popular course results');
assert.ok(popular.every((item) => item.prerequisites.length === 0), 'JSON elective data should expose no prerequisites');

const instructors = await db.searchInstructorsDb('salerno', 5);
assert.ok(instructors.some((instructor) => /salerno/i.test(instructor.lastname)), 'expected instructor search to read JSON data');

await assert.rejects(
  () => db.updateCourseDB(course.id, { name: 'Should not write' }),
  /JSON-backed backend/
);

console.log(`jsonBackend.test.js passed: ${popular.length} popular courses, ${total} search matches`);
