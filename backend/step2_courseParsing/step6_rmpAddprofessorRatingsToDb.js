// step6_rmpAddprofessorRatingsToDb_safe.js
import rmp from "ratemyprofessor-api";
import { PrismaClient } from '@prisma/client';
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- config/tweak these thresholds if needed ---
const FULLNAME_DISTANCE_THRESHOLD = 0.18; // relative Levenshtein (0 exact -> 1 very different)
const DELAY_MS = 150; // polite delay between requests
const PROGRESS_EVERY = 50;

// --- utils ---
function delay(ms){ return new Promise(res => setTimeout(res, ms)); }

function normalizeName(name){
  return (name || "")
    .normalize("NFKD")
    .replace(/[^\w\s]|_/g, "")   // remove punctuation
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function levenshtein(a, b){
  const A = a.split(''), B = b.split('');
  const m = A.length, n = B.length;
  const dp = Array.from({length: m+1}, () => new Array(n+1).fill(0));
  for (let i=0;i<=m;i++) dp[i][0] = i;
  for (let j=0;j<=n;j++) dp[0][j] = j;
  for (let i=1;i<=m;i++){
    for (let j=1;j<=n;j++){
      const cost = A[i-1] === B[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}

function nameDistance(a, b){
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na.length === 0 && nb.length === 0) return 0;
  const d = levenshtein(na, nb);
  return d / Math.max(na.length, nb.length, 1);
}

// Validate the currProfInfo returned by rmp.getProfessorRatingAtSchoolId
function isConfidentMatch(requestedFirst, requestedLast, currProfInfo, schoolId){
  if (!currProfInfo) return false;

  // Pull returned name from whatever the API gives us
  const returnedName =
    currProfInfo.formattedName ??
    currProfInfo.name ??
    `${currProfInfo.firstName ?? ""} ${currProfInfo.lastName ?? ""}`.trim();

  if (!returnedName) return false;

  // Last-name exact match is the strongest signal
  const reqLastNorm = normalizeName(requestedLast);
  const retLastNorm = normalizeName(returnedName.split(" ").slice(-1).join(" "));
  if (reqLastNorm && retLastNorm && reqLastNorm === retLastNorm) {
    return true;
  }

  // Otherwise check full-name fuzzy distance
  const fullRequested = `${requestedFirst} ${requestedLast}`;
  const dist = nameDistance(fullRequested, returnedName);
  if (dist <= FULLNAME_DISTANCE_THRESHOLD) return true;

  // Optional: check school if rmp response includes it (some responses do)
  const resultSchoolId = currProfInfo.schoolId ?? currProfInfo.school?.id ?? null;
  if (resultSchoolId && String(resultSchoolId) !== String(schoolId)) {
    // different school reported → not a match
    return false;
  }

  return false;
}

// --- main logic ---
async function main(){
  // Ensure logs dir exists
  const logsDir = path.join(__dirname, 'logs');
  try { await fs.mkdir(logsDir); } catch(e){ /* ignore if exists */ }

  const matchesPath = path.join(logsDir, 'matches.json');
  const ambiguousPath = path.join(logsDir, 'ambiguous.json');

  const matches = [];
  const ambiguous = [];
  const stats = {
    totalProfessors: 0,
    processed: 0,
    confidentMatches: 0,
    ambiguousMatches: 0,
    dbUpdateErrors: 0,
    apiErrors: 0,
  };

  console.log("[step6] Looking up school in RMP...");
  const schoolSearch = await rmp.searchSchool("York University - Keele Campus");
  if (!schoolSearch || !schoolSearch[0]) {
    console.error("School not found via RMP API. Aborting.");
    return;
  }
  const schoolId = schoolSearch[0].node?.id ?? schoolSearch[0].id;
  console.log(`[step6] Using schoolId: ${schoolId}`);

  const professors = await prisma.instructors.findMany();
  stats.totalProfessors = professors.length;
  console.log(`[step6] Processing ${stats.totalProfessors} instructors.`);

  for (const prof of professors) {
    const requestedFirst = prof.firstname;
    const requestedLast = prof.lastname;

    try {
      await delay(DELAY_MS);
      const fullName = `${requestedFirst} ${requestedLast}`;
      const currProfInfo = await rmp.getProfessorRatingAtSchoolId(fullName, schoolId);

      // Decide whether to accept
      const confident = isConfidentMatch(requestedFirst, requestedLast, currProfInfo, schoolId);

      // If not confident, we will set rating fields to null (clear bad DB values)
      let dataToUpdate;
      if (!confident) {
        dataToUpdate = {
          avgRating: null,
          avgDifficulty: null,
          wouldTakeAgainPercent: null,
          numberOfRatings: null, 
          department: null,
          rateMyProfLink: null,
          // popularity: null,
        };

        ambiguous.push({
          requested: { firstname: requestedFirst, lastname: requestedLast },
          rmpResult: currProfInfo ?? null,
          reason: "not confident match - cleared rating fields"
        });
        stats.ambiguousMatches++;
      } else {
        // Map currProfInfo fields to your Prisma model fields.
        dataToUpdate = {
          avgRating: typeof currProfInfo.avgRating === 'number' ? currProfInfo.avgRating : (currProfInfo.avg_rating ?? null),
          avgDifficulty: typeof currProfInfo.avgDifficulty === 'number' ? currProfInfo.avgDifficulty : (currProfInfo.avg_difficulty ?? null),
          wouldTakeAgainPercent: typeof currProfInfo.wouldTakeAgainPercent === 'number' ? currProfInfo.wouldTakeAgainPercent : (currProfInfo.would_take_again_percent ?? null),
          numberOfRatings: currProfInfo.numRatings ?? currProfInfo.num_ratings ?? currProfInfo.numberOfRatings ?? null,
          department: currProfInfo.department ?? currProfInfo.dept ?? null,
          rateMyProfLink: currProfInfo.link ?? currProfInfo.url ?? null
        };

        // Ensure numberOfRatings is integer or null
        if (dataToUpdate.numberOfRatings != null) {
          dataToUpdate.numberOfRatings = parseInt(dataToUpdate.numberOfRatings, 10) || null;
        }

        matches.push({
          requested: { firstname: requestedFirst, lastname: requestedLast },
          rmpResult: currProfInfo,
          updatedFields: dataToUpdate
        });
        stats.confidentMatches++;
      }

      // Perform update in DB (instructors come from DB so record exists)
      try {
        const updated = await prisma.instructors.update({
          where: {
            firstname_lastname: {
              firstname: requestedFirst,
              lastname: requestedLast
            }
          },
          data: dataToUpdate
        });

        void updated;
      } catch (dbErr) {
        // If update fails (e.g., record missing somehow), log to ambiguous and continue
        console.error(`DB update failed for ${requestedFirst} ${requestedLast}:`, dbErr?.message || dbErr);
        stats.dbUpdateErrors++;
        ambiguous.push({
          requested: { firstname: requestedFirst, lastname: requestedLast },
          rmpResult: currProfInfo ?? null,
          reason: `db update error: ${dbErr?.message || String(dbErr)}`
        });
      }

    } catch (err) {
      console.error(`Error processing ${requestedFirst} ${requestedLast}:`, err?.message || err);
      stats.apiErrors++;
      ambiguous.push({
        requested: { firstname: requestedFirst, lastname: requestedLast },
        rmpResult: null,
        reason: `exception: ${err?.message || String(err)}`
      });
      // continue to next professor
    }

    stats.processed++;
    if (
      stats.processed === 1 ||
      stats.processed % PROGRESS_EVERY === 0 ||
      stats.processed === stats.totalProfessors
    ) {
      console.log(
        `[step6] Progress ${stats.processed}/${stats.totalProfessors} | confident=${stats.confidentMatches} ambiguous=${stats.ambiguousMatches} dbErrors=${stats.dbUpdateErrors} apiErrors=${stats.apiErrors}`
      );
    }
  } // end loop

  // write logs
  try {
    await fs.writeFile(matchesPath, JSON.stringify(matches, null, 2), 'utf8');
    await fs.writeFile(ambiguousPath, JSON.stringify(ambiguous, null, 2), 'utf8');
    console.log(`[step6] Summary: ${JSON.stringify(stats)}`);
    console.log(`[step6] Wrote matches to ${matchesPath} and ambiguous cases to ${ambiguousPath}`);
  } catch (e) {
    console.error("Failed to write logs:", e?.message || e);
  }

  await prisma.$disconnect();
}

main()
  .catch(async (e) => {
    console.error("Fatal error:", e?.message || e);
    await prisma.$disconnect();
    process.exit(1);
  });
