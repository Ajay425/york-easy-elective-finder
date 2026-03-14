import * as db from '../database/dbPrismaCourses.js';
import rmp from 'ratemyprofessor-api';
import { incrementApiUsage } from '../utils/apiUsageTracker.js';

// Helpers copied/adapted from the RMP scraper script for name matching
function normalizeName(name){
    return (name || "")
        .normalize("NFKD")
        .replace(/[^\w\s]|_/g, "")
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

const FULLNAME_DISTANCE_THRESHOLD = 0.18;
function isConfidentMatch(requestedFirst, requestedLast, currProfInfo, schoolId){
    if (!currProfInfo) return false;
    const returnedName = currProfInfo.formattedName ?? currProfInfo.name ?? `${currProfInfo.firstName ?? ""} ${currProfInfo.lastName ?? ""}`.trim();
    if (!returnedName) return false;
    const reqLastNorm = normalizeName(requestedLast);
    const retLastNorm = normalizeName(returnedName.split(" ").slice(-1).join(" "));
    if (reqLastNorm && retLastNorm && reqLastNorm === retLastNorm) return true;
    const fullRequested = `${requestedFirst} ${requestedLast}`;
    const dist = nameDistance(fullRequested, returnedName);
    if (dist <= FULLNAME_DISTANCE_THRESHOLD) return true;
    const resultSchoolId = currProfInfo.schoolId ?? currProfInfo.school?.id ?? null;
    if (resultSchoolId && String(resultSchoolId) !== String(schoolId)) return false;
    return false;
}

let _cachedSchoolId = null;
async function getSchoolId(){
    if (_cachedSchoolId) return _cachedSchoolId;
    const schools = await rmp.searchSchool('York University - Keele Campus');
    if (!schools || !schools[0]) throw new Error('School not found via RMP API');
    _cachedSchoolId = schools[0].node?.id ?? schools[0].id;
    return _cachedSchoolId;
}


export async function getPopularCourses(req,res) {
    if (!req.query.terms || !req.query.types || !req.query.years || !req.query.depts || !req.query.faculties || !req.query.credits) {
            return res.status(400).json({ msg: "Missing required query parameters" });
        }
        // Normalize to arrays
        const terms = Array.isArray(req.query.terms) ? req.query.terms : [req.query.terms];
        const types = Array.isArray(req.query.types) ? req.query.types : [req.query.types];
        const years = Array.isArray(req.query.years) ? req.query.years.map(Number) : [Number(req.query.years)];
        const depts = Array.isArray(req.query.depts) ? req.query.depts : [req.query.depts];
        const faculties = Array.isArray(req.query.faculties) ? req.query.faculties : [req.query.faculties];
        const credits = Array.isArray(req.query.credits) ? req.query.credits.map(Number) : [Number(req.query.credits)];

    try{
        // Track API usage
        incrementApiUsage('getPopularCourses');

        const termAndYear = req.query.termAndYear;
        const courses = await db.getPopularCoursesDb(terms, types, years, depts, faculties, credits, termAndYear);

        return res.status(200).json({msg:"success", courses:courses})
    }
    catch(err){
        return res.status(500).json({ msg: err.message || err });    
    }

}



export async function getCourseFromParams(req,res) {

        const courseId = parseInt(req.params.id);
    try{
        const course = await db.getCourseFromIdDB(courseId)

        return res.status(200).json({msg:"success", course:course})
    }
    catch(err){
        return res.status(500).json({ msg: err.message || err });    
    }

}

export async function getCourseFromQuery(req,res) {
        const courseId = parseInt(req.query.id);
    try{
        const course = await db.getCourseFromIdDB(courseId)

        return res.status(200).json({msg:"success", course:course})
    }
    catch(err){
        return res.status(500).json({ msg: err.message || err });    
    }

}

export async function searchCourses(req, res) {
    const q = req.query.q || '';
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 50;
    try {
        const { results, total } = await db.searchCoursesDb(q, page, pageSize);
        return res.status(200).json({ msg: 'success', results, total, page, pageSize });
    } catch (err) {
        return res.status(500).json({ msg: err.message || err });
    }
}

export async function updateCourse(req, res) {
    const courseId = parseInt(req.params.id);
    const data = req.body || {};
    try {
        const updated = await db.updateCourseDB(courseId, data);
        return res.status(200).json({ msg: 'updated', course: updated });
    } catch (err) {
        return res.status(500).json({ msg: err.message || err });
    }
}

export async function deleteCourse(req, res) {
    const courseId = parseInt(req.params.id);
    try {
        await db.deleteCourseDB(courseId);
        return res.status(204).send();
    } catch (err) {
        return res.status(500).json({ msg: err.message || err });
    }
}

export async function createOffering(req, res) {
    const courseId = parseInt(req.params.id);
    const data = req.body || {};
    try {
        const offering = await db.createOfferingDB(courseId, data);
        return res.status(201).json({ msg: 'created', offering });
    } catch (err) {
        return res.status(500).json({ msg: err.message || err });
    }
}

export async function updateOffering(req, res) {
    const offeringId = parseInt(req.params.id);
    const data = req.body || {};
    try {
        const updated = await db.updateOfferingDB(offeringId, data);
        return res.status(200).json({ msg: 'updated', updated });
    } catch (err) {
        return res.status(500).json({ msg: err.message || err });
    }
}

export async function deleteOffering(req, res) {
    const offeringId = parseInt(req.params.id);
    try {
        await db.deleteOfferingDB(offeringId);
        return res.status(204).send();
    } catch (err) {
        return res.status(500).json({ msg: err.message || err });
    }
}

export async function createInstructor(req, res) {
    const data = req.body || {};
    try {
        const created = await db.createInstructorDB(data);
        return res.status(201).json({ msg: 'created', instructor: created });
    } catch (err) {
        return res.status(500).json({ msg: err.message || err });
    }
}

export async function updateInstructor(req, res) {
    const instructorId = parseInt(req.params.id);
    const data = req.body || {};
    try {
        const updated = await db.updateInstructorDB(instructorId, data);
        return res.status(200).json({ msg: 'updated', instructor: updated });
    } catch (err) {
        return res.status(500).json({ msg: err.message || err });
    }
}

export async function addInstructorToOffering(req, res) {
    const offeringId = parseInt(req.params.id);
    const { instructorId } = req.body || {};
    if (!instructorId) return res.status(400).json({ msg: 'instructorId required' });
    try {
        const created = await db.addInstructorToOfferingDB(offeringId, instructorId);
        return res.status(201).json({ msg: 'created', created });
    } catch (err) {
        return res.status(500).json({ msg: err.message || err });
    }
}

export async function removeInstructorFromOffering(req, res) {
    const offeringId = parseInt(req.params.id);
    const instructorId = parseInt(req.params.instructorId);
    try {
        await db.removeInstructorFromOfferingDB(offeringId, instructorId);
        return res.status(204).send();
    } catch (err) {
        return res.status(500).json({ msg: err.message || err });
    }
}

export async function searchInstructors(req, res) {
    const q = req.query.q || '';
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    try {
        const results = await db.searchInstructorsDb(q, limit);
        return res.status(200).json({ msg: 'success', results });
    } catch (err) {
        return res.status(500).json({ msg: err.message || err });
    }
}

export async function getInstructorInfo(req, res){
    const firstname = (req.query.firstname || '').trim();
    const lastname = (req.query.lastname || '').trim();
    if (!firstname && !lastname) return res.status(400).json({ msg: 'firstname or lastname required' });
    try{
        const schoolId = await getSchoolId();
        const fullName = `${firstname} ${lastname}`;
        const currProfInfo = await rmp.getProfessorRatingAtSchoolId(fullName, schoolId);

        const confident = isConfidentMatch(firstname, lastname, currProfInfo, schoolId);

        const mapped = {
            avgRating: typeof currProfInfo?.avgRating === 'number' ? currProfInfo.avgRating : (currProfInfo?.avg_rating ?? null),
            avgDifficulty: typeof currProfInfo?.avgDifficulty === 'number' ? currProfInfo.avgDifficulty : (currProfInfo?.avg_difficulty ?? null),
            wouldTakeAgainPercent: typeof currProfInfo?.wouldTakeAgainPercent === 'number' ? currProfInfo.wouldTakeAgainPercent : (currProfInfo?.would_take_again_percent ?? null),
            numberOfRatings: currProfInfo?.numRatings ?? currProfInfo?.num_ratings ?? currProfInfo?.numberOfRatings ?? null,
            department: currProfInfo?.department ?? currProfInfo?.dept ?? null,
            rateMyProfLink: currProfInfo?.link ?? currProfInfo?.url ?? null,
        };
        if (mapped.numberOfRatings != null) mapped.numberOfRatings = parseInt(mapped.numberOfRatings, 10) || null;

        return res.status(200).json({ msg: 'success', confident, info: mapped, raw: currProfInfo });
    }catch(err){
        return res.status(500).json({ msg: err.message || err });
    }
}

export async function generateInstructorPopularity(req, res) {
    const instructorId = parseInt(req.params.id);
    try {
        const updated = await db.recomputeInstructorPopularity(instructorId);
        return res.status(200).json({ msg: 'success', instructor: updated });
    } catch (err) {
        return res.status(500).json({ msg: err.message || err });
    }
}