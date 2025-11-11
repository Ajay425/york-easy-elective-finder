import * as db from '../database/dbPrisma.js';


export async function getPopularCourses(req,res) {
const terms = Array.isArray(req.query.terms) ? req.query.terms : [req.query.terms || 'F'];
const types = Array.isArray(req.query.types) ? req.query.types : [req.query.types || 'LECT'];
const years = Array.isArray(req.query.years) ? req.query.years.map(Number) : [Number(req.query.years) || 1];
const depts = Array.isArray(req.query.depts) ? req.query.depts : [req.query.depts || 'EECS'];
const faculties = Array.isArray(req.query.faculties) ? req.query.faculties : [req.query.faculties || 'LE'];
const credits = Array.isArray(req.query.credits) ? req.query.credits.map(Number) : [Number(req.query.credits) || 3];

    try{

        const courses = await db.getPopularCoursesDb(terms,types,years,depts,faculties,credits)

        return res.status(200).json({msg:"success", courses:courses})
    }
    catch(err){

        return res.status(400).json({msg:err})
    }


}