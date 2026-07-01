import rmp from 'ratemyprofessor-api';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { collectInstructors, loadAllCourses, normalizeName } from './jsonPipelineArtifacts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const rmpDataPath = process.env.RMP_OUTPUT_FILE || path.join(backendRoot, 'data', 'profs', 'yorku_RMP_data.json');
const matchesPath = process.env.RMP_MATCHES_FILE || path.join(__dirname, 'logs', 'matches.json');
const ambiguousPath = process.env.RMP_AMBIGUOUS_FILE || path.join(__dirname, 'logs', 'ambiguous.json');
const maxProfessors = Number(process.env.RMP_MAX_PROFESSORS || 0) || null;
const delayMs = Number(process.env.RMP_DELAY_MS || 150);
const FULLNAME_DISTANCE_THRESHOLD = 0.18;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function levenshtein(a, b) {
  const left = a.split('');
  const right = b.split('');
  const matrix = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0));

  for (let i = 0; i <= left.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= right.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[left.length][right.length];
}

function nameDistance(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na.length === 0 && nb.length === 0) return 0;
  return levenshtein(na, nb) / Math.max(na.length, nb.length, 1);
}

function isConfidentMatch(requestedFirst, requestedLast, currProfInfo, schoolId) {
  if (!currProfInfo) return false;

  const returnedName =
    currProfInfo.formattedName ??
    currProfInfo.name ??
    `${currProfInfo.firstName ?? ''} ${currProfInfo.lastName ?? ''}`.trim();

  if (!returnedName) return false;

  const reqLastNorm = normalizeName(requestedLast);
  const retLastNorm = normalizeName(returnedName.split(' ').slice(-1).join(' '));
  if (reqLastNorm && retLastNorm && reqLastNorm === retLastNorm) {
    return true;
  }

  const dist = nameDistance(`${requestedFirst} ${requestedLast}`, returnedName);
  if (dist <= FULLNAME_DISTANCE_THRESHOLD) return true;

  const resultSchoolId = currProfInfo.schoolId ?? currProfInfo.school?.id ?? null;
  if (resultSchoolId && String(resultSchoolId) !== String(schoolId)) {
    return false;
  }

  return false;
}

async function main() {
  await fs.mkdir(path.dirname(matchesPath), { recursive: true });
  await fs.mkdir(path.dirname(ambiguousPath), { recursive: true });
  await fs.mkdir(path.dirname(rmpDataPath), { recursive: true });

  const courses = await loadAllCourses();
  const instructors = collectInstructors(courses).filter((instructor) => instructor.firstname && instructor.firstname !== 'TBA');
  const limit = maxProfessors ? Math.min(maxProfessors, instructors.length) : instructors.length;

  const schoolSearch = await rmp.searchSchool('York University - Keele Campus');
  if (!schoolSearch || !schoolSearch[0]) {
    throw new Error('School not found via RMP API');
  }

  const schoolId = schoolSearch[0].node?.id ?? schoolSearch[0].id;
  const matches = [];
  const ambiguous = [];
  const results = [];

  console.log(`[step6-json] Fetching RMP ratings for ${limit}/${instructors.length} instructor(s)`);

  for (let index = 0; index < limit; index++) {
    const instructor = instructors[index];
    const first = instructor.firstname;
    const last = instructor.lastname;

    await delay(delayMs);
    const currProfInfo = await rmp.getProfessorRatingAtSchoolId(`${first} ${last}`, schoolId);
    const confident = isConfidentMatch(first, last, currProfInfo, schoolId);

    let record;
    if (!confident) {
      record = {
        id: index + 1,
        dept: instructor.dept || '',
        first,
        last,
        avgRating: 0,
        avgDifficulty: 0,
        wouldTakeAgainPercent: -1,
        numratings: 0,
        overall_rating: 0,
        rateMyProfLink: null,
      };

      ambiguous.push({
        requested: { firstname: first, lastname: last },
        rmpResult: currProfInfo ?? null,
        reason: 'not confident match - cleared rating fields',
      });
    } else {
      record = {
        id: index + 1,
        dept: instructor.dept || '',
        first,
        last,
        avgRating: typeof currProfInfo.avgRating === 'number' ? currProfInfo.avgRating : (currProfInfo.avg_rating ?? null),
        avgDifficulty: typeof currProfInfo.avgDifficulty === 'number' ? currProfInfo.avgDifficulty : (currProfInfo.avg_difficulty ?? null),
        wouldTakeAgainPercent: typeof currProfInfo.wouldTakeAgainPercent === 'number'
          ? currProfInfo.wouldTakeAgainPercent
          : (currProfInfo.would_take_again_percent ?? null),
        numratings: currProfInfo.numRatings ?? currProfInfo.num_ratings ?? currProfInfo.numberOfRatings ?? 0,
        overall_rating: typeof currProfInfo.avgRating === 'number' ? currProfInfo.avgRating : (currProfInfo.avg_rating ?? null),
        rateMyProfLink: currProfInfo.link ?? currProfInfo.url ?? null,
      };

      matches.push({
        requested: { firstname: first, lastname: last },
        rmpResult: currProfInfo,
        updatedFields: {
          avgRating: record.avgRating,
          avgDifficulty: record.avgDifficulty,
          wouldTakeAgainPercent: record.wouldTakeAgainPercent,
          numberOfRatings: record.numratings,
          department: instructor.dept || null,
          rateMyProfLink: record.rateMyProfLink,
        },
      });
    }

    results.push(record);

    if (index === 0 || (index + 1) % 50 === 0 || index + 1 === limit) {
      console.log(`[step6-json] Progress ${index + 1}/${limit}`);
    }
  }

  await Promise.all([
    fs.writeFile(rmpDataPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8'),
    fs.writeFile(matchesPath, `${JSON.stringify(matches, null, 2)}\n`, 'utf8'),
    fs.writeFile(ambiguousPath, `${JSON.stringify(ambiguous, null, 2)}\n`, 'utf8'),
  ]);

  console.log(`[step6-json] Saved ${results.length} instructor rows to ${rmpDataPath}`);
  console.log(`[step6-json] Wrote matches to ${matchesPath} and ambiguous cases to ${ambiguousPath}`);
}

main().catch((error) => {
  console.error(`[step6-json] Failed: ${error.message}`);
  process.exit(1);
});