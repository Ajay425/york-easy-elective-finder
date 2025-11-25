import fs from 'fs'
function updateLectCatNumbers(courses) {
  courses.forEach(course => {
    // Iterate over terms
    course.terms.forEach(term => {
      // Create a mapping of section to catNumber for LAB and TUTORIAL meetings
      const sectionCatNumberMap = {};

      // Gather catNumbers from LAB, TUTR, BLEN, ONLN, ONCA meetings
      term.meetings.forEach(meeting => {
        // Extract the section number from the meeting type (e.g., 'LAB 01', 'ONLN01', etc.)
        const section = meeting.type.split(' ')[1] || meeting.type.slice(4);  // Extract section number (e.g., '01' from 'LAB 01' or 'ONLN01')

        if (
          meeting.type.startsWith('LAB') || 
          meeting.type.startsWith('TUTR') || 
          meeting.type.startsWith('BLEN') || 
          meeting.type.startsWith('ONLN') || 
          meeting.type.startsWith('ONCA')
        ) {
          // For LAB, TUTR, BLEN, ONLN, and ONCA, store the catNumber for each section
          if (meeting.catNumber) {
            sectionCatNumberMap[section] = meeting.catNumber;
          }
        }
      });

      // Now update LECT, BLEN, ONLN, ONCA meetings with the matching catNumber from LAB or TUTR in the same section
      term.meetings.forEach(meeting => {
        if (
          (meeting.type.startsWith('LECT') || 
           meeting.type.startsWith('BLEN') || 
           meeting.type.startsWith('ONLN') || 
           meeting.type.startsWith('ONCA')) && 
          !meeting.catNumber
        ) {
          // Extract the section number from the meeting (e.g., 'LECT01' -> '01')
          const section = meeting.type.slice(4);

          // Only update if a matching catNumber exists for that section
          if (sectionCatNumberMap[section]) {
            meeting.catNumber = sectionCatNumberMap[section];  // Assign the catNumber from LAB/TUTR with the same section
          }
        }
      });
    });
  });

  return courses;
}


// Update the course data with catNumbers for LECT
const json = fs.readFileSync('all_courses2.json', {encoding:'utf-8'})
const obj = JSON.parse(json);
const updatedObj = updateLectCatNumbers(obj)

const newJson = JSON.stringify(updatedObj, null, 2); // The 'null, 2' adds indentation for readability
fs.writeFileSync('all_courses2.json', newJson, { encoding: 'utf-8' });

console.log('File has been updated!');