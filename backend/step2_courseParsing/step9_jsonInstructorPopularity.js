import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const rmpDataPath = process.env.RMP_INPUT_FILE || process.env.RMP_OUTPUT_FILE || path.join(backendRoot, 'data', 'profs', 'yorku_RMP_data.json');
const PROGRESS_EVERY = 250;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const isMissing = (value) => value == null || value === -1;

function normalizeRating(value) {
  if (isMissing(value) || value === 0) return null;
  return clamp((value - 1) / 4);
}

function normalizeDifficulty(value) {
  if (isMissing(value) || value === 0) return null;
  return 1 - clamp((value - 1) / 4);
}

function normalizeWouldAgain(value) {
  if (isMissing(value)) return null;
  return clamp(value / 100);
}

function computePopularity(professor) {
  const hasRmpLink = !!(professor.rateMyProfLink && professor.rateMyProfLink.trim());
  if (!hasRmpLink) return 0;

  const numberOfRatings = Math.max(0, professor.numratings ?? professor.numberOfRatings ?? 0);
  const noReviews =
    (professor.avgRating === 0 || professor.avgRating == null || professor.avgRating === -1) &&
    (professor.avgDifficulty === 0 || professor.avgDifficulty == null || professor.avgDifficulty === -1) &&
    (professor.wouldTakeAgainPercent == null || professor.wouldTakeAgainPercent === -1) &&
    numberOfRatings === 0;

  if (noReviews) return 0;

  let ratingNorm = normalizeRating(professor.avgRating ?? professor.overall_rating);
  let difficultyNorm = normalizeDifficulty(professor.avgDifficulty);
  let againNorm = normalizeWouldAgain(professor.wouldTakeAgainPercent);

  const hasSomeRatingData = ratingNorm !== null || difficultyNorm !== null;
  const missingAgainOnly = againNorm === null && hasSomeRatingData && numberOfRatings > 0;
  if (missingAgainOnly) againNorm = 0.5;

  const parts = [
    [ratingNorm, 0.6],
    [againNorm, 0.3],
    [difficultyNorm, 0.1],
  ];
  const available = parts.filter(([value]) => value !== null);
  let quality;
  if (available.length === 0) {
    quality = 0.5;
  } else {
    const totalWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
    quality = available.reduce((sum, [value, weight]) => sum + value * (weight / totalWeight), 0);
  }

  if (numberOfRatings === 0) return 0;

  const prior = 0.5;
  const priorStrength = 10;
  const adjusted = (priorStrength * prior + numberOfRatings * quality) / (priorStrength + numberOfRatings);
  return Math.round(100 * clamp(adjusted));
}

const data = JSON.parse(await fs.readFile(rmpDataPath, 'utf8'));
if (!Array.isArray(data)) {
  throw new Error(`${rmpDataPath} must contain an array`);
}

for (let index = 0; index < data.length; index++) {
  const professor = data[index];
  professor.popularity = computePopularity(professor);

  const processed = index + 1;
  if (processed === 1 || processed % PROGRESS_EVERY === 0 || processed === data.length) {
    console.log(`[step9-json] Progress ${processed}/${data.length}`);
  }
}

await fs.writeFile(rmpDataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`[step9-json] Wrote popularity values to ${rmpDataPath}`);