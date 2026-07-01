import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const runtimePipelineDir = path.join(backendRoot, 'runtime', 'pipeline');

export const artifactPaths = {
  step2Courses: path.join(runtimePipelineDir, 'step2_courses.json'),
  step3PrereqEdges: path.join(runtimePipelineDir, 'step3_prereq_edges.json'),
  step4Instructors: path.join(runtimePipelineDir, 'step4_instructors.json'),
  step5Departments: path.join(runtimePipelineDir, 'step5_departments.json'),
  step7Offerings: path.join(runtimePipelineDir, 'step7_course_offerings.json'),
  step8InstructorOfferings: path.join(runtimePipelineDir, 'step8_instructor_offerings.json'),
  step10CourseTimes: path.join(runtimePipelineDir, 'courseTimes.json'),
  step12CoursePrereqs: path.join(runtimePipelineDir, 'step12_course_prereqs.json'),
};

export async function loadAllCourses(coursesPath = process.env.COURSES_FILE || path.join(__dirname, 'all_courses.json')) {
  const courses = JSON.parse(await fs.readFile(coursesPath, 'utf8'));
  if (!Array.isArray(courses)) {
    throw new Error(`${coursesPath} must contain an array`);
  }
  return courses;
}

export async function writeJsonArtifact(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function normalizeName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s]|_/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function collectCourseSnapshots(courses) {
  return courses.map((course, index) => ({
    id: index + 1,
    facultyPrefix: course.facultyPrefix || '',
    dept: course.dept || '',
    code: course.code || '',
    credit: Number(course.credit),
    title: course.title || '',
    description: course.description || '',
    language: course.language || null,
    termAndYear: course.termAndYear || null,
    prereqCount: Array.isArray(course.prereqs) ? course.prereqs.length : 0,
    termCount: Array.isArray(course.terms) ? course.terms.length : 0,
  }));
}

export function collectPrereqEdges(courses) {
  const edges = [];

  for (const course of courses) {
    for (const prereq of Array.isArray(course.prereqs) ? course.prereqs : []) {
      edges.push({
        course: {
          facultyPrefix: course.facultyPrefix || '',
          dept: course.dept || '',
          code: course.code || '',
          credit: Number(course.credit),
        },
        prereq: {
          faculty: prereq.faculty || '',
          dept: prereq.dept || '',
          code: prereq.code || '',
          credits: Number(prereq.credits),
        },
        raw: prereq.full || null,
      });
    }
  }

  return edges;
}

export function collectInstructors(courses) {
  const byKey = new Map();

  for (const course of courses) {
    for (const term of Array.isArray(course.terms) ? course.terms : []) {
      for (const meeting of Array.isArray(term.meetings) ? term.meetings : []) {
        const instructors = Array.isArray(meeting.instructors) && meeting.instructors.length
          ? meeting.instructors
          : [{ firstName: 'TBA', lastName: '' }];

        for (const instructor of instructors) {
          const first = String(instructor?.firstName || 'TBA').trim();
          const last = String(instructor?.lastName || '').trim();
          if (!first || first === 'TBA') continue;

          const key = `${normalizeName(first)}|${normalizeName(last)}`;
          if (!byKey.has(key)) {
            byKey.set(key, {
              firstname: first,
              lastname: last,
              departments: new Set(),
              courseCount: 0,
              meetingCount: 0,
            });
          }

          const record = byKey.get(key);
          if (course.dept) record.departments.add(course.dept);
          record.courseCount += 1;
          record.meetingCount += 1;
        }
      }
    }
  }

  return [...byKey.values()]
    .map((record) => ({
      firstname: record.firstname,
      lastname: record.lastname,
      dept: [...record.departments].sort().join(', '),
      courseCount: record.courseCount,
      meetingCount: record.meetingCount,
    }))
    .sort((a, b) => `${a.lastname} ${a.firstname}`.localeCompare(`${b.lastname} ${b.firstname}`));
}

export function collectDepartments(courses) {
  const faculties = new Map();
  const departments = new Map();

  for (const course of courses) {
    if (course.facultyPrefix) {
      faculties.set(course.facultyPrefix, (faculties.get(course.facultyPrefix) || 0) + 1);
    }
    if (course.dept) {
      departments.set(course.dept, (departments.get(course.dept) || 0) + 1);
    }
  }

  return {
    faculties: [...faculties.entries()]
      .map(([facultyPrefix, count]) => ({ facultyPrefix, count }))
      .sort((a, b) => a.facultyPrefix.localeCompare(b.facultyPrefix)),
    departments: [...departments.entries()]
      .map(([dept, count]) => ({ dept, count }))
      .sort((a, b) => a.dept.localeCompare(b.dept)),
  };
}

export function collectCourseOfferings(courses) {
  const offerings = [];

  for (const course of courses) {
    for (const term of Array.isArray(course.terms) ? course.terms : []) {
      offerings.push({
        course: {
          facultyPrefix: course.facultyPrefix || '',
          dept: course.dept || '',
          code: course.code || '',
          credit: Number(course.credit),
        },
        term: term.term || null,
        section: term.section || null,
        catNumber: term.catNumber || null,
        meetingCount: Array.isArray(term.meetings) ? term.meetings.length : 0,
        meetings: Array.isArray(term.meetings) ? term.meetings : [],
      });
    }
  }

  return offerings;
}

export function collectInstructorOfferings(courses) {
  const rows = [];

  for (const course of courses) {
    for (const term of Array.isArray(course.terms) ? course.terms : []) {
      for (const meeting of Array.isArray(term.meetings) ? term.meetings : []) {
        const instructors = Array.isArray(meeting.instructors) && meeting.instructors.length
          ? meeting.instructors
          : [{ firstName: 'TBA', lastName: '' }];

        for (const instructor of instructors) {
          rows.push({
            course: {
              facultyPrefix: course.facultyPrefix || '',
              dept: course.dept || '',
              code: course.code || '',
              credit: Number(course.credit),
            },
            term: term.term || null,
            section: term.section || null,
            type: meeting.type || null,
            catNumber: meeting.catNumber || null,
            instructor: {
              firstname: instructor?.firstName || 'TBA',
              lastname: instructor?.lastName || '',
            },
          });
        }
      }
    }
  }

  return rows;
}

export function collectCoursePrereqs(courses) {
  return courses.map((course) => ({
    course: {
      facultyPrefix: course.facultyPrefix || '',
      dept: course.dept || '',
      code: course.code || '',
      credit: Number(course.credit),
    },
    prereqs: Array.isArray(course.prereqs) ? course.prereqs : [],
  }));
}

export function serializeCourseTimesLookup(courseTimes) {
  return {
    fileCount: courseTimes.fileCount,
    parsedRows: courseTimes.parsedRows,
    parsedComponents: courseTimes.parsedComponents,
    matchedKeys: courseTimes.matchedKeys,
    allBySection: [...courseTimes.allBySection.entries()],
    commonBySection: [...courseTimes.commonBySection.entries()],
    byCat: [...courseTimes.byCat.entries()],
    componentMeta: [...courseTimes.componentMeta.entries()],
    catsBySection: [...courseTimes.catsBySection.entries()].map(([key, value]) => [key, [...value]]),
  };
}

export function hydrateCourseTimesLookup(serialized) {
  if (!serialized || typeof serialized !== 'object') return null;

  return {
    fileCount: Number(serialized.fileCount) || 0,
    parsedRows: Number(serialized.parsedRows) || 0,
    parsedComponents: Number(serialized.parsedComponents) || 0,
    matchedKeys: Number(serialized.matchedKeys) || 0,
    allBySection: new Map(Array.isArray(serialized.allBySection) ? serialized.allBySection : []),
    commonBySection: new Map(Array.isArray(serialized.commonBySection) ? serialized.commonBySection : []),
    byCat: new Map(Array.isArray(serialized.byCat) ? serialized.byCat : []),
    componentMeta: new Map(Array.isArray(serialized.componentMeta) ? serialized.componentMeta : []),
    catsBySection: new Map(
      Array.isArray(serialized.catsBySection)
        ? serialized.catsBySection.map(([key, value]) => [key, new Set(Array.isArray(value) ? value : [])])
        : []
    ),
  };
}