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