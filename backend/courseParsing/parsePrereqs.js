// parsePrereqs.js

// const courseData = {
//   description: `This two-course sequence develops students' understanding of financial accounting information so that they can be informed and effective users of the information. The courses focus on uses of accounting information for different decisions and from different stakeholder perspectives, and consider the economic and behavioural effects that accounting treatments have on users and preparers. Readings from current publications are used to demonstrate practical applications of the issues discussed in class. Classroom techniques such as case studies, classroom discussions, student presentations and group and individual research projects (intended to develop students' critical skills) are employed. Prerequisite: SB/ ACTG 2010 3.00. Course Credit Exclusion: GL/ECON 2710 3.00.`
// };
export default function extractPrereqsWithCredits(description) {
  // ✅ Capture only the "Prerequisite(s)" or "Pre-requisite(s)" section
  // Stops before known headers or end of string.
  const prereqBlockRe =
    /\bPre-?requisite[s]?\s*:\s*([\s\S]*?)(?=(?:\s*(?:\.|\)|;)?\s*(?:Course\s+Credit\s+Exclusions?[^:]*:|Course\s+Credit\s+Exclusion[^:]*:|Co-?requisites?[^:]*:|Corequisites?[^:]*:|(?:NCR\s+)?Notes?[^:]*:|Open\s+to\b|Prior\s+to\b|Previously\b[^:]*:)|$))/gi;

  // ✅ Course with credits (e.g., LE/EECS2030 3.00)
  const fullCourseRe = /([A-Z]{1,3})\s*\/\s*([A-Z]+)\s*(\d{3,4}[A-Z]?)\s+(\d+(?:\.\d+)?)/g;

  // ✅ Credits-only tails (e.g., "or 6.00")
  const creditsOnlyRe = /\bor\s+(\d+(?:\.\d+)?)(?!\s*\/)/gi;

  const results = [];
  const blocks = [...description.matchAll(prereqBlockRe)];
  if (blocks.length === 0) return [];

  for (const block of blocks) {
    let text = block[1].trim();

    // 🧩 Fallback: if no known keyword follows, and the text continues past the
    // final course, stop at the *last* sentence-ending period that is NOT part of a credit number.
    const fallbackMatch = /(?<!\d)\.\s+[A-Z]/.exec(text);
    if (fallbackMatch) {
      const cutoff = fallbackMatch.index + 1;
      text = text.slice(0, cutoff);
    }

    const fullMatches = [...text.matchAll(fullCourseRe)];
    if (fullMatches.length === 0) continue;

    for (let i = 0; i < fullMatches.length; i++) {
      const m = fullMatches[i];
      const faculty = m[1].toUpperCase().trim();
      const dept = m[2].toUpperCase().trim();
      const code = m[3].toUpperCase().trim();
      const credits = parseFloat(m[4]);
      const subject = `${faculty}/${dept}`;

      // ✅ Extract year from first digit of the numeric code
      const year = parseInt(code[0], 10) || null;

      // Push the main match
      results.push({
        full: `${subject} ${code} ${credits}`,
        faculty,
        dept,
        code,
        credits,
        year, // 👈 new field
      });

      // Handle "or 6.00" style credits
      const start = m.index + m[0].length;
      const end =
        i + 1 < fullMatches.length ? fullMatches[i + 1].index : text.length;
      const tail = text.slice(start, end);

      for (const c of tail.matchAll(creditsOnlyRe)) {
        results.push({
          full: `${subject} ${code} ${c[1]}`,
          faculty,
          dept,
          code,
          credits: parseFloat(c[1]),
          year, // 👈 keep same year
        });
      }
    }
  }

  // ✅ Deduplicate
  return Array.from(new Map(results.map((o) => [o.full, o])).values());
}



// Test
// const prereqs = extractPrereqsWithCredits(courseData.description);
// console.log("Extracted prerequisites (deduped):");
// console.log(prereqs);
