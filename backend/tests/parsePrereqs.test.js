import assert from 'node:assert/strict';
import { extractPrereqsWithCredits } from '../step2_courseParsing/parsePrereqsHelperFunc.js';

function simplify(rows) {
  return rows.map((row) => ({
    faculty: row.faculty,
    dept: row.dept,
    code: row.code,
    credits: row.credits,
    requirementType: row.requirementType,
  }));
}

function keys(rows) {
  return simplify(rows).map((row) => `${row.faculty}/${row.dept} ${row.code} ${row.credits} ${row.requirementType}`).sort();
}

assert.deepEqual(
  keys(extractPrereqsWithCredits(
    'Prerequisite: SB/ACTG 2010 3.00. Course Credit Exclusion: GL/ECON 2710 3.00.'
  )),
  ['SB/ACTG 2010 3 prerequisite']
);

assert.deepEqual(
  keys(extractPrereqsWithCredits(
    'Prerequisite(s): One of SC/MATH 1013 3.00, SC/MATH 1300 3.00, GL/MATH 1901, SC/ISCI 1401 3.00; Course credit exclusions: SC/MATH 1014 3.00.'
  )),
  [
    'SC/ISCI 1401 3 prerequisite',
    'SC/MATH 1013 3 prerequisite',
    'SC/MATH 1300 3 prerequisite',
  ]
);

assert.deepEqual(
  keys(extractPrereqsWithCredits(
    'Prerequisite or corequisite: HH/PSYC 1010 6.00, GL/PSYC 2510 6.00. Course credit exclusions: HH/PSYC 2020 6.00.'
  )),
  [
    'GL/PSYC 2510 6 corequisite',
    'HH/PSYC 1010 6 corequisite',
  ]
);

assert.deepEqual(
  keys(extractPrereqsWithCredits(
    'Prerequisites: Film BFA foundation program and permission of the Film Department. Prerequisite: FA/CMA 2010 6.00 or 9.00. Course credit exclusion: FA/FILM 4001 6.00.'
  )),
  [
    'FA/CMA 2010 6 prerequisite',
    'FA/CMA 2010 9 prerequisite',
  ]
);

assert.deepEqual(
  keys(extractPrereqsWithCredits(
    'Prerequisite or corequisite: SC/BIOL 3110 3.00 or SC/BCHM 3110 3.00. Strongly recommended prerequisite or corequisite: SC/BIOL 3130 3.00 or SC/BCHM 3130 3.00.'
  )),
  [
    'SC/BCHM 3110 3 corequisite',
    'SC/BIOL 3110 3 corequisite',
  ]
);

assert.deepEqual(
  keys(extractPrereqsWithCredits(
    'Prerequisites: CCY 1999 6.00, CCY 2999 6.00 Course Credit Exclusion: AP/HUMA 3695 6.00',
    { facultyPrefix: 'AP', dept: 'CCY' }
  )),
  [
    'AP/CCY 1999 6 prerequisite',
    'AP/CCY 2999 6 prerequisite',
  ]
);

assert.deepEqual(
  keys(extractPrereqsWithCredits(
    'Prerequisite: SOSC/CRIM 1650 6.00, with a grade of at least B.',
    { facultyPrefix: 'AP', dept: 'SOSC' }
  )),
  [
    'AP/CRIM 1650 6 prerequisite',
    'AP/SOSC 1650 6 prerequisite',
  ]
);

assert.deepEqual(
  keys(extractPrereqsWithCredits('Prerequisite: AP/ADMS/DEMS 2700 3.00.')),
  [
    'AP/ADMS 2700 3 prerequisite',
    'AP/DEMS 2700 3 prerequisite',
  ]
);

assert.deepEqual(
  keys(extractPrereqsWithCredits('Prerequisite(s): AS/HH/SC/KINE 3012 3.00 or SC/BIOL 3060 4.00.')),
  [
    'AS/KINE 3012 3 prerequisite',
    'HH/KINE 3012 3 prerequisite',
    'SC/BIOL 3060 4 prerequisite',
    'SC/KINE 3012 3 prerequisite',
  ]
);

assert.deepEqual(
  keys(extractPrereqsWithCredits(
    'Prerequisites/Corequisites: HH/KINE 4010 3.00, HH/KINE 4020 3.00. Note 1: Students must have access to personal transportation.'
  )),
  [
    'HH/KINE 4010 3 corequisite',
    'HH/KINE 4020 3 corequisite',
  ]
);

assert.deepEqual(
  keys(extractPrereqsWithCredits(
    'Pre- or Co-requisite: FA/CMA 1100 3.00. Co- or prerequisite: GS/NURS 5830 3.00 and GS/NURS 5810 3.00.'
  )),
  [
    'FA/CMA 1100 3 corequisite',
    'GS/NURS 5810 3 corequisite',
    'GS/NURS 5830 3 corequisite',
  ]
);

assert.deepEqual(
  keys(extractPrereqsWithCredits('Prerequisites: 12U Advanced Functions (MHF4U) or equivalent.')),
  []
);

assert.deepEqual(
  keys(extractPrereqsWithCredits(
    'Suggested pre-requisites: SC/BIOL 3130 3.00. Former prerequisite: SC/BIOL 2120 3.00.'
  )),
  []
);

assert.deepEqual(
  keys(extractPrereqsWithCredits(
    'AP/ADMS 1000 3.00 is not a prerequisite for AP/ADMS 2500 3.00, but is strongly recommended. Course credit exclusions: AP/ADMS 1500 3.00, AP/ADMS 1550 3.00.'
  )),
  []
);

assert.deepEqual(
  keys(extractPrereqsWithCredits(
    'Prerequisites: undergraduate courses in biochemistry and molecular biology. Students may not also receive credit for GS/BIOL 5027 3.00.'
  )),
  []
);

console.log('parsePrereqs.test.js passed');
