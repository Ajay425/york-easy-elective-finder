const KNOWN_FACULTY_PREFIXES = new Set([
  "AP",
  "ED",
  "EU",
  "FA",
  "GL",
  "GS",
  "HH",
  "LE",
  "SB",
  "SC",
  // Historical York prefixes that still appear in old course descriptions.
  "AK",
  "AS",
]);

const REQUIREMENT_HEADER_RE =
  /\b(?:(?:Course|General|MBA|MFIN)\s+)?(?:Pre-?\s*requisite(?:s|\(s\))?(?:\s*(?:\/|and|or)\s*Co-?\s*requisite(?:s|\(s\))?)?|Co-?\s*requisite(?:s|\(s\))?(?:\s*(?:\/|and|or)\s*Pre-?\s*requisite(?:s|\(s\))?)?|Pre\s*(?:-?\s*\/\s*|-?\s*or\s+|-?\s*and\s+)Co-?\s*requisite(?:s|\(s\))?|Co\s*(?:-?\s*\/\s*|-?\s*or\s+|-?\s*and\s+)Pre-?\s*requisite(?:s|\(s\))?)(?:\s+for\b[^:.]{0,120})?\s*:?\s*:\s*/gi;

const STOP_HEADER_RE =
  /\b(?:(?:Strongly\s+)?Recommended[^:]*:|Suggested[^:]*:|Former\s+(?:pre-?\s*requisite|co-?\s*requisite)[^:]*:|Course\s+Credit\s+Exclusions?\b[^:.]{0,80}:?|Course\s+Credit\s+Exclusion\b[^:.]{0,80}:?|Course\s+Exclusions?\b[^:.]{0,80}:?|Course\s+Exclusion\b[^:.]{0,80}:?|Students\s+may\s+not\s+(?:also\s+)?receive\s+credit\b|NCR\s+Note[^:]*:|NCR\s*:|Notes?[^:]*:|Open\s+to\b|Not\s+open\s+to\b|Prior\s+to\b|Previously\b[^:]*:|Cross-?List(?:ed|ing)?[^:]*:|Integrated\s+with\b|CCEs?\s*:)/gi;

const FULL_COURSE_RE =
  /\b((?:[A-Z]{2,5}\s*\/\s*)*[A-Z]{2,5})\s*(\d{3,4}[A-Z]?)\s+(\d+(?:\.\d+)?)/g;

const CREDITS_ONLY_RE = /\bor\s+(\d+(?:\.\d+)?)(?!\s*\/)/gi;

function normalizeContext(context = {}) {
  return {
    faculty: String(context.facultyPrefix || context.faculty || "").trim().toUpperCase(),
    dept: String(context.dept || context.deptAcronym || "").trim().toUpperCase(),
  };
}

function isIgnoredRequirementHeader(description, index) {
  const before = description.slice(Math.max(0, index - 48), index);
  return /(?:strongly\s+)?recommended\s+$|suggested\s+$|former\s+$|not\s+(?:a\s+)?$/i.test(before);
}

function requirementTypeFromHeader(headerText) {
  return /co-?\s*requisite|corequisite|\bco\b/i.test(headerText) ? "corequisite" : "prerequisite";
}

function findRequirementHeaders(description) {
  const headers = [];
  for (const match of description.matchAll(REQUIREMENT_HEADER_RE)) {
    if (isIgnoredRequirementHeader(description, match.index)) continue;
    headers.push({
      index: match.index,
      end: match.index + match[0].length,
      type: requirementTypeFromHeader(match[0]),
    });
  }
  return headers;
}

function firstStopIndex(text) {
  let earliest = text.length;
  for (const match of text.matchAll(STOP_HEADER_RE)) {
    earliest = Math.min(earliest, match.index);
  }

  return earliest;
}

function extractRequirementBlocks(description) {
  const headers = findRequirementHeaders(description);
  const blocks = [];

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    const nextHeaderIndex = i + 1 < headers.length ? headers[i + 1].index : description.length;
    const rawText = description.slice(header.end, nextHeaderIndex);
    const text = rawText.slice(0, firstStopIndex(rawText)).trim();
    if (text) blocks.push({ text, type: header.type });
  }

  return blocks;
}

function subjectsFromRaw(rawSubject, context) {
  const normalized = rawSubject.replace(/\s+/g, "").toUpperCase();
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) return [];

  if (parts.length === 1) {
    if (!context.faculty) return [];
    return [{ faculty: context.faculty, dept: parts[0] }];
  }

  if (KNOWN_FACULTY_PREFIXES.has(parts[0])) {
    const faculty = parts[0];
    const rest = parts.slice(1);
    const legacyFacultyPrefixes = rest.slice(0, -1).filter((part) => KNOWN_FACULTY_PREFIXES.has(part));

    if (legacyFacultyPrefixes.length > 0) {
      const dept = rest[rest.length - 1];
      return [faculty, ...legacyFacultyPrefixes].map((prefix) => ({ faculty: prefix, dept }));
    }

    return rest.map((dept) => ({ faculty, dept }));
  }

  if (parts.length > 2) {
    const facultyIndex = parts.findIndex((part) => KNOWN_FACULTY_PREFIXES.has(part));
    if (facultyIndex >= 0 && facultyIndex + 1 < parts.length) {
      return [{ faculty: parts[facultyIndex], dept: parts[parts.length - 1] }];
    }
  }

  if (context.faculty) {
    return parts.map((dept) => ({ faculty: context.faculty, dept }));
  }

  return [];
}

function pushCourse(results, subject, code, credits, requirementType) {
  const year = parseInt(code[0], 10);
  results.push({
    full: `${subject.faculty}/${subject.dept} ${code} ${credits}`,
    faculty: subject.faculty,
    dept: subject.dept,
    code,
    credits,
    year,
    requirementType,
  });
}

export function extractPrereqsWithCredits(description, context = {}) {
  const normalizedContext = normalizeContext(context);
  const results = [];
  const blocks = extractRequirementBlocks(String(description || ""));

  for (const block of blocks) {
    const fullMatches = [...block.text.matchAll(FULL_COURSE_RE)];
    if (fullMatches.length === 0) continue;

    for (let i = 0; i < fullMatches.length; i++) {
      const match = fullMatches[i];
      const subjects = subjectsFromRaw(match[1], normalizedContext);
      const code = match[2].toUpperCase().trim();
      const credits = parseFloat(match[3]);

      if (subjects.length === 0 || Number.isNaN(credits)) continue;

      for (const subject of subjects) {
        pushCourse(results, subject, code, credits, block.type);
      }

      const start = match.index + match[0].length;
      const end = i + 1 < fullMatches.length ? fullMatches[i + 1].index : block.text.length;
      const tail = block.text.slice(start, end);

      for (const creditOnly of tail.matchAll(CREDITS_ONLY_RE)) {
        const alternateCredits = parseFloat(creditOnly[1]);
        if (Number.isNaN(alternateCredits)) continue;
        for (const subject of subjects) {
          pushCourse(results, subject, code, alternateCredits, block.type);
        }
      }
    }
  }

  return Array.from(
    new Map(
      results.map((item) => [
        `${item.faculty}|${item.dept}|${item.code}|${item.credits}|${item.requirementType}`,
        item,
      ])
    ).values()
  );
}
