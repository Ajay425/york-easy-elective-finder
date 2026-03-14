import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient()

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
    console.log(err)
    throw err;
}

}

//unused below so far
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

