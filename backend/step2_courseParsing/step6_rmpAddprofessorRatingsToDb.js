import rmp from "ratemyprofessor-api";

import { PrismaClient } from '../generated/prisma/index.js';
const prisma = new PrismaClient();

import { promises as fs } from "fs";
import path from "path";

async function main(){

      const school = await rmp.searchSchool("York University - Keele Campus");
      if (school == undefined) {
        console.log("School not found. Returning")
        return
      }
    const schoolId = school[0].node.id;
    const professors = await prisma.instructors.findMany();
    for (let prof of professors){
        //Query the pacakge
        const currProfInfo = await rmp.getProfessorRatingAtSchoolId(
      `${prof.firstname} ${prof.lastname}`,
        schoolId
        );

        const insertProfRating = await prisma.professor.update(
            {
                where:{
                    firstname_lastname:{
                      firstname: prof.firstname,
                      lastname: prof.lastname
                                        }
                },
            data:{
                avgRating: currProfInfo.avgRating,
                avgDifficulty: currProfInfo.avgDifficulty,
                wouldTakeAgainPercent: currProfInfo.wouldTakeAgainPercent,
                numberOfRatings: currProfInfo.numRatings,
                department:currProfInfo.department,
                rateMyProfLink:currProfInfo.link
            }
        })
        console.log(insertProfRating)
    }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

