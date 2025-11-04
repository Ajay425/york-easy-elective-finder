// parsePrereqs.js

// const courseData = {
//   description: `This two-course sequence develops students' understanding of financial accounting information so that they can be informed and effective users of the information. The courses focus on uses of accounting information for different decisions and from different stakeholder perspectives, and consider the economic and behavioural effects that accounting treatments have on users and preparers. Readings from current publications are used to demonstrate practical applications of the issues discussed in class. Classroom techniques such as case studies, classroom discussions, student presentations and group and individual research projects (intended to develop students' critical skills) are employed. Prerequisite: SB/ ACTG 2010 3.00. Course Credit Exclusion: GL/ECON 2710 3.00.`
// };

export function extractPrereqsWithCredits(description) {
  // ✅ Match only "Prerequisite(s):"
  const pattern = /Prerequisites?:([\s\S]*?)(?=(?:\. |Corequisite:|Course Credit Exclusion:|Note:|Open to|$))/i;
  const match = description.match(pattern);
  if (!match) return [];

  const text = match[1];

  // ✅ Match courses like "SB/ACTG 2010 3.00" or "SB / ACTG 2010 3.00"
  const re = /([A-Z]{1,3}\s*\/\s*[A-Z]+)\s+(\d{3,4})\s+(\d+(?:\.\d+)?)/g;
  const results = [];
  let m;

  while ((m = re.exec(text)) !== null) {
    const subject = m[1].replace(/\s*/g, "").replace("/", "/");
    results.push({
      full: `${subject} ${m[2]} ${m[3]}`,
      faculty: subject.split("/")[0],
      dept: subject.split("/")[1],
      code: m[2],
      credits: parseFloat(m[3])
    });
  }

  // ✅ Remove duplicates
  return Array.from(new Map(results.map(o => [o.full, o])).values());
}

// Test
// const prereqs = extractPrereqsWithCredits(courseData.description);
// console.log("Extracted prerequisites (deduped):");
// console.log(prereqs);
