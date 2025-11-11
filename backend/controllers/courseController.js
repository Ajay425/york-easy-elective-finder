import * as db from '../database/dbPrisma.js';


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

        const courses = await db.getPopularCoursesDb(terms,types,years,depts,faculties,credits)

        return res.status(200).json({msg:"success", courses:courses})
    }
    catch(err){
        return res.status(500).json({ msg: err.message || err });    
    }

}