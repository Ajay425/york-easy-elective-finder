import * as db from '../database/dbPrismaPrereq.js';


export async function deletePrereq(req,res){
const prereqId = parseInt(req.params.id);
try{
    const deletePrereq = await db.deletePrereq(prereqId)
    return res.status(204).json({msg:"success", deletePrereq})
}
catch(err){
    return res.status(500).json({msg:err})
}

}

export async function createPrereq(req, res) {
    const { courseId, prereqId } = req.body || {};
    if (!courseId || !prereqId) return res.status(400).json({ msg: 'courseId and prereqId required' });
    try {
        // reuse db helper in courses module if available
        const coursesDb = await import('../database/dbPrismaCourses.js');
        const created = await coursesDb.createPrereqDB(Number(courseId), Number(prereqId));
        return res.status(201).json({ msg: 'created', created });
    } catch (err) {
        return res.status(500).json({ msg: err.message || err });
    }
}