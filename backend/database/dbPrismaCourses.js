import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readSessionTermAndYear() {
  const sessionMetaPath = path.join(__dirname, '../step1_PythonCourseScraper/session_meta.json');
  try {
    const raw = await fs.readFile(sessionMetaPath, 'utf-8');
    const meta = JSON.parse(raw);
    return meta?.termAndYear ?? null;
  } catch {
    return null;
  }
}

function parseTermAndYear(termAndYear) {
  // Expected format: "Season YYYY" (e.g. "Summer 2026")
  if (!termAndYear || typeof termAndYear !== 'string') return null;
  const parts = termAndYear.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const year = Number(parts[parts.length - 1]);
  const season = parts.slice(0, -1).join(' ');
  if (Number.isNaN(year)) return null;
  const seasonOrder = {
    Winter: 1,
    Spring: 2,
    Summer: 3,
    Fall: 4,
    Autumn: 4,
  };
  const seasonRank = seasonOrder[season] ?? 0;
  return { year, season, seasonRank, raw: termAndYear };
}

async function getLatestTermAndYearFromDb() {
  const rows = await prisma.currentCourseOfferings.findMany({
    where: { termAndYear: { not: null } },
    select: { termAndYear: true },
    distinct: ['termAndYear'],
  });
  const uniqueTerms = [...new Set(rows.map((r) => r.termAndYear).filter(Boolean))];
  const parsed = uniqueTerms
    .map(parseTermAndYear)
    .filter(Boolean)
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.seasonRank - a.seasonRank;
    });
  return parsed[0]?.raw ?? null;
}

// Popularity computation (ported from step9_addInstructorPopularity.js)
const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x))
const isMissing = (v) => v == null || v === -1

function normalizeRating(v) {
  if (isMissing(v) || v === 0) return null // 0 means “no reviews"
  return clamp((v - 1) / 4)
}

function normalizeDifficulty(v) {
  if (isMissing(v) || v === 0) return null
  return 1 - clamp((v - 1) / 4)
}

function normalizeWouldAgain(pct) {
  if (isMissing(pct)) return null
  return clamp(pct / 100)
}

function computePopularity(prof) {
  const hasRmpLink = !!(prof.rateMyProfLink && String(prof.rateMyProfLink).trim())
  if (!hasRmpLink) return 0

  const n = Math.max(0, prof.numberOfRatings ?? 0)

  const noReviews =
    (prof.avgRating === 0 || prof.avgRating == null || prof.avgRating === -1) &&
    (prof.avgDifficulty === 0 || prof.avgDifficulty == null || prof.avgDifficulty === -1) &&
    (prof.wouldTakeAgainPercent == null || prof.wouldTakeAgainPercent === -1) &&
    n === 0

  if (noReviews) return 0

  let ratingNorm = normalizeRating(prof.avgRating)
  let diffNorm = normalizeDifficulty(prof.avgDifficulty)
  let againNorm = normalizeWouldAgain(prof.wouldTakeAgainPercent)

  const hasSomeRatingData = ratingNorm !== null || diffNorm !== null
  const missingAgainOnly = againNorm === null && hasSomeRatingData && n > 0
  if (missingAgainOnly) againNorm = 0.5

  const parts = [
    [ratingNorm, 0.6],
    [againNorm, 0.3],
    [diffNorm, 0.1],
  ]
  const available = parts.filter(([v]) => v !== null)
  let quality
  if (available.length === 0) {
    quality = 0.5
  } else {
    const sumW = available.reduce((s, [, w]) => s + w, 0)
    quality = available.reduce((s, [v, w]) => s + v * (w / sumW), 0)
  }

  if (n === 0) return 0

  const prior = 0.5
  const priorStrength = 10
  const qualityAdj = (priorStrength * prior + n * quality) / (priorStrength + n)

  return Math.round(100 * clamp(qualityAdj))
}

export async function recomputeInstructorPopularity(instructorId) {
  try {
    const prof = await prisma.instructors.findUnique({ where: { id: Number(instructorId) } });
    if (!prof) throw new Error('Instructor not found');
    const popularity = computePopularity(prof);
    const updated = await prisma.instructors.update({ where: { id: Number(instructorId) }, data: { popularity } });
    return updated;
  } catch (err) {
    throw err;
  }
}

export async function getPopularCoursesDb(terms, types, years, depts, faculties, credits, termAndYear) {
  try {
    const normalizedRequestedTermAndYear =
      typeof termAndYear === 'string' ? termAndYear.trim() : termAndYear;
    const effectiveTermAndYear =
      normalizedRequestedTermAndYear || (await getLatestTermAndYearFromDb());

    if (!effectiveTermAndYear) {
      return [];
    }

    const offeringWhere = {
      term: { in: terms },
      type: { in: types },
      termAndYear: { equals: effectiveTermAndYear },
    };

    const courses5 = await prisma.course.findMany({
      where: {
        year: { in: years },
        deptAcronym: { in: depts },
        faculty: { in: faculties },
        credit: { in: credits },
        prerequisites: { none: {} },
        courseOfferings: { some: offeringWhere },
      },
      include: {
        prerequisites: true,
        courseOfferings: {
          where: offeringWhere,
          include: {
            courseTimes: true, // ✅ include times
            instructors: {
              include: { instructor: true },
              orderBy: { instructor: { popularity: "desc" } },
              take: 1, // only the most popular per offering
            },
          },
        },
      },
    });

    // ✅ Sort times within each offering (dayOfWeek, then startTime)
    // Day order map (adjust if your DB uses different letters)
    const dayOrder = { M: 1, T: 2, W: 3, R: 4, Th: 4, F: 5, Sat: 6, Sun: 7 };

    for (const c of courses5) {
      for (const o of c.courseOfferings) {
        o.courseTimes.sort((a, b) => {
          const da = dayOrder[a.dayOfWeek] ?? 99;
          const db = dayOrder[b.dayOfWeek] ?? 99;
          if (da !== db) return da - db;
          return (a.startTime ?? "").localeCompare(b.startTime ?? "");
        });
      }

      // you already did this per course:
      c.courseOfferings.sort((a, b) => {
        const popA = a.instructors[0]?.instructor?.popularity ?? -1;
        const popB = b.instructors[0]?.instructor?.popularity ?? -1;
        return popB - popA; // most-popular offering first
      });
    }

    // now sort the WHOLE courses list by the top instructor of the top offering
    courses5.sort((a, b) => {
      const bestA = a.courseOfferings[0]?.instructors[0]?.instructor?.popularity ?? -1;
      const bestB = b.courseOfferings[0]?.instructors[0]?.instructor?.popularity ?? -1;
      if (bestB !== bestA) return bestB - bestA;

      // optional tie-breakers:
      const nA = a.courseOfferings[0]?.instructors[0]?.instructor?.numberOfRatings ?? -1;
      const nB = b.courseOfferings[0]?.instructors[0]?.instructor?.numberOfRatings ?? -1;
      if (nB !== nA) return nB - nA;

      // final stable tie-breaker (course code/alpha)
      return `${a.deptAcronym}${a.courseCode}`.localeCompare(`${b.deptAcronym}${b.courseCode}`);
    });

    return courses5;
  } catch (err) {
    throw err;
  }
}

export async function getCourseFromIdDB(courseId) {
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        courseOfferings: {
          include: {
            // includes the join rows; each has `.instructor` relation
            instructors: {
              include: {
                instructor: true
              }
            }
          }
        },
        // include prerequisite relation so templates can show readable course info
        prerequisites: { include: { prerequisite: true } },
        prerequisiteFor: { include: { course: true } },
      },
    });
    return course;
  } catch (err) {
    throw err;
  }
}

export async function deletePrereq(prereqId) {
try{
    const prereq = await prisma.coursePrerequisite.delete({
        where:{
            id: prereqId
        },
    })
    return prereq;
}
catch(err){
    throw err;
}

}

export async function deletePrereqFromCourse(courseId, prereqcourseId) {
try{
    const prereq = await prisma.coursePrerequisite.delete({
        where:{
            courseId_prereqId:{
                courseId:courseId,
                prereqId:prereqcourseId,
            }
        },
    })
    return prereq;
}
catch(err){
    throw err;
}

}

export async function searchCoursesDb(query, page = 1, pageSize = 50, filters = {}) {
  try {
    const q = String(query || '').trim();

    const andClauses = [];

    // Split query into tokens and require each token to match at least one searchable field.
    if (q) {
      const rawTokens = q.split(/\s+/).map((t) => t.trim()).filter(Boolean);
      const tokens = rawTokens.map((t) => t.replace(/[^a-z0-9]/gi, '')).filter(Boolean);
      if (tokens.length) {
        andClauses.push(
          ...tokens.map((t) => {
            const or = [];
            if (/^\d+$/.test(t)) {
              or.push({ courseCode: { equals: t } });
            }
            or.push({ name: { contains: t, mode: 'insensitive' } });
            or.push({ deptAcronym: { contains: t, mode: 'insensitive' } });
            or.push({ courseCode: { contains: t, mode: 'insensitive' } });
            or.push({ faculty: { contains: t, mode: 'insensitive' } });
            return { OR: or };
          })
        );
      }
    }

    const depts = Array.isArray(filters.depts)
      ? filters.depts.map((v) => String(v).trim()).filter(Boolean)
      : [];
    const faculties = Array.isArray(filters.faculties)
      ? filters.faculties.map((v) => String(v).trim()).filter(Boolean)
      : [];
    const languages = Array.isArray(filters.languages)
      ? filters.languages.map((v) => String(v).trim()).filter(Boolean)
      : [];
    const years = Array.isArray(filters.years)
      ? filters.years.map((v) => Number(v)).filter((v) => Number.isFinite(v))
      : [];
    const credits = Array.isArray(filters.credits)
      ? filters.credits.map((v) => Number(v)).filter((v) => Number.isFinite(v))
      : [];
    const terms = Array.isArray(filters.terms)
      ? filters.terms.map((v) => String(v).trim()).filter(Boolean)
      : [];
    const types = Array.isArray(filters.types)
      ? filters.types.map((v) => String(v).trim()).filter(Boolean)
      : [];
    const hasElectives = filters.hasElectives === true;
    const hasNoElectives = filters.hasNoElectives === true;

    if (depts.length) andClauses.push({ deptAcronym: { in: depts } });
    if (faculties.length) andClauses.push({ faculty: { in: faculties } });
    if (languages.length) andClauses.push({ language: { in: languages } });
    if (years.length) andClauses.push({ year: { in: years } });
    if (credits.length) andClauses.push({ credit: { in: credits } });

    if (terms.length || types.length) {
      const offeringWhere = {};
      if (terms.length) offeringWhere.term = { in: terms };
      if (types.length) offeringWhere.type = { in: types };
      andClauses.push({ courseOfferings: { some: offeringWhere } });
    }

    if (hasElectives && !hasNoElectives) {
      // In this schema, a course has prerequisites if it has at least one row in CoursePrerequisite.
      andClauses.push({ prerequisites: { some: {} } });
    }

    if (hasNoElectives && !hasElectives) {
      andClauses.push({ prerequisites: { none: {} } });
    }

    const where = andClauses.length ? { AND: andClauses } : {};

    // total count for pagination
    const total = await prisma.course.count({ where });

    // calculate skip/take for pagination; page is 1-based
    const p = Math.max(1, Number(page) || 1);
    const size = Number(pageSize) || 50;
    const skip = (p - 1) * size;

    const items = await prisma.course.findMany({
      where,
      skip,
      take: size,
      orderBy: [
        { deptAcronym: 'asc' },
        { courseCode: 'asc' },
      ],
    });

    const results = items.map((c) => {
      return {
        id: c.id,
        title: c.name,
        code: `${c.deptAcronym} ${c.courseCode}`,
        deptAcronym: c.deptAcronym,
        year: c.year,
        language: c.language,
        desc: c.desc,
        faculty: c.faculty,
        credit: c.credit,
      };
    });

    return { results, total };
  } catch (err) {
    throw err;
  }
}

export async function getCourseSearchFilterOptionsDb() {
  try {
    const [
      deptRows,
      facultyRows,
      yearRows,
      creditRows,
      languageRows,
      termRows,
      typeRows,
    ] = await Promise.all([
      prisma.course.findMany({ select: { deptAcronym: true }, distinct: ['deptAcronym'] }),
      prisma.course.findMany({ select: { faculty: true }, distinct: ['faculty'] }),
      prisma.course.findMany({ select: { year: true }, distinct: ['year'] }),
      prisma.course.findMany({ select: { credit: true }, distinct: ['credit'] }),
      prisma.course.findMany({ select: { language: true }, distinct: ['language'], where: { language: { not: null } } }),
      prisma.currentCourseOfferings.findMany({ select: { term: true }, distinct: ['term'] }),
      prisma.currentCourseOfferings.findMany({ select: { type: true }, distinct: ['type'] }),
    ]);

    const toSortedStrings = (rows, key) => rows
      .map((r) => r[key])
      .filter((v) => typeof v === 'string' && v.trim() !== '')
      .sort((a, b) => a.localeCompare(b));

    return {
      depts: toSortedStrings(deptRows, 'deptAcronym'),
      faculties: toSortedStrings(facultyRows, 'faculty'),
      languages: toSortedStrings(languageRows, 'language'),
      terms: toSortedStrings(termRows, 'term'),
      types: toSortedStrings(typeRows, 'type'),
      years: yearRows
        .map((r) => r.year)
        .filter((v) => Number.isFinite(v))
        .sort((a, b) => b - a),
      credits: creditRows
        .map((r) => r.credit)
        .filter((v) => Number.isFinite(v))
        .sort((a, b) => a - b),
    };
  } catch (err) {
    throw err;
  }
}

export async function updateCourseDB(courseId, data) {
  try {
    // whitelist fields that can be updated
    const updatable = {};
    const fields = ['faculty','deptAcronym','courseCode','credit','name','desc','language','year'];
    for (const f of fields) {
      if (data[f] !== undefined) updatable[f] = data[f];
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: updatable,
    });
    return updated;
  } catch (err) {
    throw err;
  }
}

export async function deleteCourseDB(courseId) {
  try {
    // remove instructor offerings linked to the course's offerings, remove offerings, remove prerequisites (both directions), then remove course
    // find offerings
    const offerings = await prisma.currentCourseOfferings.findMany({ where: { courseId } });
    const offeringIds = offerings.map((o) => o.id);

    if (offeringIds.length) {
      // delete instructorOfferings rows
      await prisma.instructorOfferings.deleteMany({ where: { courseOfferingId: { in: offeringIds } } });
      // delete course offerings
      await prisma.currentCourseOfferings.deleteMany({ where: { id: { in: offeringIds } } });
    }

    // delete prerequisites where course is either side
    await prisma.coursePrerequisite.deleteMany({ where: { OR: [{ courseId }, { prereqId: courseId }] } });

    // finally delete course
    const deleted = await prisma.course.delete({ where: { id: courseId } });
    return deleted;
  } catch (err) {
    throw err;
  }
}

export async function createPrereqDB(courseId, prereqId) {
  try {
    const created = await prisma.coursePrerequisite.create({
      data: { courseId: courseId, prereqId: prereqId },
    });
    return created;
  } catch (err) {
    throw err;
  }
}

export async function createOfferingDB(courseId, offeringData) {
  try {
    const created = await prisma.currentCourseOfferings.create({
      data: {
        term: offeringData.term,
        courseId,
        section: offeringData.section,
        catNumber: offeringData.catNumber,
        type: offeringData.type,
      },
    });
    return created;
  } catch (err) {
    throw err;
  }
}

export async function updateOfferingDB(offeringId, data) {
  try {
    const updatable = {};
    const fields = ['term', 'section', 'catNumber', 'type'];
    for (const f of fields) if (data[f] !== undefined) updatable[f] = data[f];
    const updated = await prisma.currentCourseOfferings.update({ where: { id: offeringId }, data: updatable });
    return updated;
  } catch (err) {
    throw err;
  }
}

export async function deleteOfferingDB(offeringId) {
  try {
    // delete instructorOfferings first (FK)
    await prisma.instructorOfferings.deleteMany({ where: { courseOfferingId: offeringId } });
    const deleted = await prisma.currentCourseOfferings.delete({ where: { id: offeringId } });
    return deleted;
  } catch (err) {
    throw err;
  }
}

export async function createInstructorDB(data) {
  try {
    const fields = ['firstname','lastname','avgRating','avgDifficulty','wouldTakeAgainPercent','numberOfRatings','department','rateMyProfLink','popularity'];
    const payload = {};
    for (const f of fields) {
      if (data[f] === undefined) continue;
      const val = data[f];
      // coerce numeric fields and treat empty strings as null
      if (['avgRating','avgDifficulty','wouldTakeAgainPercent','popularity'].includes(f)) {
        payload[f] = val === '' ? null : Number(val);
      } else if (f === 'numberOfRatings') {
        payload[f] = val === '' ? null : parseInt(val, 10);
      } else {
        payload[f] = val;
      }
    }
    // If popularity not provided, compute from other fields where possible
    if (payload.popularity === undefined || payload.popularity === null) {
      try {
        payload.popularity = computePopularity(payload);
      } catch (err) {
        payload.popularity = null
      }
    }

    const created = await prisma.instructors.create({ data: payload });
    return created;
  } catch (err) { throw err; }
}

export async function updateInstructorDB(instructorId, data) {
  try {
    const fields = ['firstname','lastname','avgRating','avgDifficulty','wouldTakeAgainPercent','numberOfRatings','department','rateMyProfLink','popularity'];
    const payload = {};
    for (const f of fields) {
      if (data[f] === undefined) continue;
      const val = data[f];
      if (['avgRating','avgDifficulty','wouldTakeAgainPercent','popularity'].includes(f)) {
        payload[f] = val === '' ? null : Number(val);
      } else if (f === 'numberOfRatings') {
        payload[f] = val === '' ? null : parseInt(val, 10);
      } else {
        payload[f] = val;
      }
    }

    // Recompute popularity unless the client explicitly provided a value
    if (data.popularity === undefined) {
      try {
        // Build a temporary prof object by merging existing DB values for missing keys
        const existing = await prisma.instructors.findUnique({ where: { id: instructorId } });
        const profForCalc = { ...existing, ...payload };
        payload.popularity = computePopularity(profForCalc);
      } catch (err) {
        // fallback: leave popularity untouched
      }
    }

    const updated = await prisma.instructors.update({ where: { id: instructorId }, data: payload });
    return updated;
  } catch (err) { throw err; }
}

export async function addInstructorToOfferingDB(offeringId, instructorId) {
  try {
    const created = await prisma.instructorOfferings.create({ data: { instructorId: Number(instructorId), courseOfferingId: Number(offeringId) } });
    return created;
  } catch (err) { throw err; }
}

export async function removeInstructorFromOfferingDB(offeringId, instructorId) {
  try {
    const deleted = await prisma.instructorOfferings.delete({ where: { instructorId_courseOfferingId: { instructorId: Number(instructorId), courseOfferingId: Number(offeringId) } } });
    return deleted;
  } catch (err) { throw err; }
}

export async function searchInstructorsDb(query, limit = 10) {
  try {
    const q = String(query || '').trim();
    if (!q) return [];
    const results = await prisma.instructors.findMany({ where: { OR: [ { firstname: { contains: q, mode: 'insensitive' } }, { lastname: { contains: q, mode: 'insensitive' } } ] }, take: limit });
    return results;
  } catch (err) { throw err; }
}

