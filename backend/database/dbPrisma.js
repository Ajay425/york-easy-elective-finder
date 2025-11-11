import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient()


export async function getPopularCoursesDb(terms,types,years,depts, faculties, credits){

    try{
        const courses5 = await prisma.course.findMany({
                        where: {
                            year: { in: years },
                            deptAcronym: { in: depts },
                            faculty: { in: faculties },
                            credit: {in: credits},
                            prerequisites: { none: {} },
                            courseOfferings: { some: { term: { in: terms }, type: { in: types } } },
                        },
                        include: {
                            prerequisites:true,
                            courseOfferings: {
                            where: { term: { in: terms }, type: { in: types } },
                            include: {
                                instructors: {
                                include: { instructor: true },
                                orderBy: { instructor: { popularity: 'desc' } },
                                take: 1, // <-- only the most popular per offering
                                },
                            },
                            },
                        },
                    });
        // you already did this per course:
        for (const c of courses5) {
        c.courseOfferings.sort((a, b) => {
            const popA = a.instructors[0]?.instructor?.popularity ?? -1
            const popB = b.instructors[0]?.instructor?.popularity ?? -1
            return popB - popA // most-popular offering first
        })
        }

        // now sort the WHOLE courses list by the top instructor of the top offering
        courses5.sort((a, b) => {
        const bestA = a.courseOfferings[0]?.instructors[0]?.instructor?.popularity ?? -1
        const bestB = b.courseOfferings[0]?.instructors[0]?.instructor?.popularity ?? -1
        if (bestB !== bestA) return bestB - bestA

        // optional tie-breakers:
        const nA = a.courseOfferings[0]?.instructors[0]?.instructor?.numberOfRatings ?? -1
        const nB = b.courseOfferings[0]?.instructors[0]?.instructor?.numberOfRatings ?? -1
        if (nB !== nA) return nB - nA

        // final stable tie-breaker (course code/alpha)
        return `${a.deptAcronym}${a.courseCode}`.localeCompare(`${b.deptAcronym}${b.courseCode}`)
        })

        return courses5;

    }
    catch(err){
        throw err;
    }
}