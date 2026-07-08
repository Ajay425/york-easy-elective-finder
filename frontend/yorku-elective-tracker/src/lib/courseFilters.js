export const FACULTIES = [
  "AK", "AP", "AS", "ATH", "DMS", "ED", "ES", "EU", "FA", "GL", 
  "GS", "HH", "IOL", "LE", "OSC", "RIM", "SB", "SC"
];

export const DEPARTMENTS = [
  "ACTG", "ADMS", "ANTH", "ARB", "ARTH", "ARTM", "ASL", "AUCO", 
  "BBED", "BC", "BCHEM", "BCHM", "BIOL", "BPHS", "BUSI", "CAPS", 
  "CCY", "CDIS", "CDNS", "CGTA", "CH", "CHEM", "CIVL", "CLST", 
  "CLTR", "CMA", "CMCT", "CMDS", "COGS", "COMN", "COOP", "COST", 
  "CRIM", "CSE", "CWR", "DANC", "DATT", "DCAD", "DDPR", "DEMS", 
  "DESN", "DEST", "DIGM", "DLLL", "DRAA", "DVST", "EATS", "ECON", 
  "EDFE", "EDIN", "EDIS", "EDJI", "EDPJ", "EDPR", "EDST", "EDUC", 
  "EECS", "EIL", "EMBA", "EN", "ENG", "ENTP", "ENTR", "ENVB", 
  "ENVS", "ESL", "ESS", "ESSE", "EXCH", "FACC", "FACS", "FAST", 
  "FILM", "FINE", "FND", "FNEN", "FNMI", "FR", "FRAN", "FREN", 
  "GBUS", "GEOG", "GER", "GFWS", "GH", "GK", "GKM", "GLBL", 
  "GNRL", "GWST", "HEB", "HIMP", "HIST", "HLST", "HLTH", "HND", 
  "HREQ", "HRM", "HUMA", "IBUS", "IHST", "INDG", "INDV", "INTL", 
  "ISCI", "ITEC", "JP", "KAHS", "KINE", "KOR", "LA", "LAL", 
  "LAW", "LIN", "LLDV", "MACC", "MATH", "MECH", "MFIN", "MGMT", 
  "MIST", "MMAI", "MODR", "MSTM", "MUSI", "NATS", "NRSC", "NURS", 
  "OMIS", "ORGS", "PACC", "PHED", "PHIL", "PHYS", "PKIN", "POLS", 
  "POR", "PPAS", "PRWR", "PSYC", "RELS", "SCIE", "SGMT", "SLGS", 
  "SOCI", "SOSC", "SOWK", "SP", "STS", "SWAH", "SXST", "TECH", 
  "TESL", "THST", "TRON", "URST", "VISA", "WKST", "WRIT"
];

export const DEPARTMENT_LABELS = {
  ACTG: "Accounting",
  ADMS: "Administrative Studies",
  ANCW: "Ancient World Studies",
  ANTH: "Anthropology",
  ARB: "Arabic",
  ARTH: "Art History",
  ASL: "ASL American Sign Language",
  BC: "Bethune College",
  BEAP: "Business Economics and Policy",
  BIOL: "Biology",
  CCCC: "C4 (Cross-Campus Capstone Classroom)",
  CCY: "Children, Childhood and Youth",
  CH: "Chinese",
  CHEM: "Chemistry",
  CLST: "Classical Studies",
  CLTR: "Culture",
  CMA: "Cinema and Media Arts",
  CMDS: "Communication and Media Studies",
  COGS: "Cognitive Science",
  CRIM: "Criminology",
  CWR: "Creative Writing",
  DANC: "Dance",
  DATT: "Digital Media Program",
  DDPR: "Dual Degree Program",
  DEMS: "Disaster and Emergency Management",
  DESN: "Design",
  DLLL: "Languages, Literatures and Linguistics",
  ECON: "Economics",
  EDST: "Educational Studies",
  EECS: "Electrical Engineering and Computer Science",
  EN: "English",
  ENG: "Engineering",
  ENTP: "Entrepreneurship and Innovation",
  ENTR: "Entrepreneurial Studies",
  ENVS: "Environmental Studies",
  ESSE: "Earth, Space Science and Engineering",
  EXCH: "Exchange",
  FINE: "Finance",
  FND: "Fundamentals of Learning",
  FR: "French Studies",
  GBUS: "Global Business",
  GEOG: "Geography",
  GER: "German",
  GH: "Global Health",
  GK: "Greek",
  GKM: "Modern Greek",
  GLBL: "Global Political Studies",
  GSWS: "Gender, Sexuality & Women's Studies",
  GWST: "Gender and Women's Studies",
  HEB: "Hebrew",
  HIST: "History",
  HLST: "Health Studies",
  HND: "Hindi",
  HREQ: "Human Rights and Equity Studies",
  HRM: "Human Resources Management",
  HUMA: "Humanities",
  IHST: "Interdisciplinary Health Studies",
  INDG: "Indigenous Studies",
  IPH: "Interprofessional Health",
  IT: "Italian",
  ITEC: "Information Technology",
  JC: "Jamaican Creole",
  JP: "Japanese",
  JWST: "Jewish Studies",
  KINE: "Kinesiology & Health Science",
  KOR: "Korean",
  LA: "Latin",
  LASO: "Law and Society",
  LING: "Linguistics",
  LLS: "Language and Learning Seminar",
  MATH: "Mathematics and Statistics",
  MGMT: "Management",
  MIST: "Multicultural and Indigenous Studies",
  MKTG: "Marketing",
  MODR: "Modes of Reasoning",
  MUSI: "Music",
  NATS: "Natural Science",
  NURS: "Nursing",
  OMIS: "Operations Management and Information Systems",
  ORGS: "Organization Studies",
  PANF: "Pan-Faculty",
  PERS: "Persian",
  PHIL: "Philosophy",
  PHYS: "Physics and Astronomy",
  POLS: "Political Science",
  POR: "Portuguese",
  PPAS: "Public Policy and Administration Studies",
  PROP: "Real Property",
  PRWR: "Professional Writing",
  PSYC: "Psychology",
  RLST: "Religious Studies",
  SGMT: "Strategic Management",
  SOCI: "Sociology",
  SOSC: "Social Science",
  SOWK: "Social Work",
  SP: "Spanish",
  STS: "Science and Technology Studies",
  SUST: "Sustainability",
  SXST: "Sexuality Studies",
  TECL: "Technology at Lassonde",
  TESL: "Teaching English to Speakers of Other Languages",
  THEA: "Theatre",
  URST: "Urban Studies",
  VISA: "Visual Arts",
  WRIT: "Writing",
};

export function getDepartmentLabel(dept) {
  const code = String(dept || "").trim().toUpperCase();
  const label = DEPARTMENT_LABELS[code];
  return label ? `${code} - ${label}` : code;
}

export function getDepartmentDescription(dept) {
  const code = String(dept || "").trim().toUpperCase();
  return DEPARTMENT_LABELS[code] || "";
}




export const TERMS = ['F', 'W', 'Y'];
export const TERM_LABELS = {
  F: "Fall",
  W: "Winter",
  Y: "Full Year",
  M: "Full Year",
  N: "Fall/Winter",
  A: "Summer",
  B: "Summer First Half",
  C: "Summer Second Half",
  S1: "Summer First Half",
  S2: "Summer Second Half",
  S3: "Summer Full",
  SU: "Summer",
};
export const COURSE_TYPES = [
  'LECT',
  'SEMR',
  'SEM',
  'TUTR',
  'LAB',
  'BLEN',
  'ONLN',
  'ONCA',
  'HYFX',
  'CLIN',
  'CORS',
  'STDO',
  'DIRD',
  'DISS',
  'ISTY',
  'IDS',
  'FDEX',
  'FIEL',
  'INSP',
  'LGCL',
  'PERF',
  'PRAC',
  'REEV',
  'REMT',
  'RESP',
  'REVP',
  'WKSP',
  'COOP',
  'THES',
];

export const COURSE_TYPE_LABELS = {
  BLEN: "Blended learning",
  CLIN: "Clinical",
  COOP: "Co-op",
  CORS: "Correspondence",
  DIRD: "Directed reading",
  DISS: "Dissertation",
  FDEX: "Field experience",
  FIEL: "Field trip",
  HYFX: "Hyflex",
  IDS: "Individual directed study",
  INSP: "Internship",
  ISTY: "Independent studies",
  LAB: "Laboratory",
  LECT: "Lecture",
  LGCL: "Language classes",
  ONCA: "Online - campus assessment",
  ONLN: "Online learning",
  PERF: "Performance",
  PRAC: "Practicum",
  REEV: "Research evaluation",
  REMT: "Remote",
  RESP: "Research paper",
  REVP: "Review paper",
  SEM: "Seminar",
  SEMR: "Seminar",
  STDO: "Studio",
  THES: "Thesis",
  TUTR: "Tutorial",
  WKSP: "Workshop",
};

export const COURSE_TYPE_DESCRIPTIONS = {
  BLEN: "Combination of virtual and in-person components.",
  DIRD: "Individually guided reading or study structure.",
  FDEX: "Field-based experience component.",
  FIEL: "Field trip component.",
  HYFX: "Hyflex: students may be able to attend in person or remotely.",
  ISTY: "Independent studies course or component.",
  LAB: "Lab component, often paired with a lecture.",
  LECT: "Lecture meeting group.",
  LGCL: "Language-class component.",
  ONCA: "Online course with in-person campus assessments.",
  ONLN: "Online learning; instructor defines synchronous/asynchronous details.",
  REMT: "Remote course with scheduled online meeting times.",
  SEM: "Seminar-style meeting group.",
  SEMR: "Seminar-style meeting group.",
  STDO: "Studio component.",
  TUTR: "Tutorial component, often paired with a lecture.",
  WKSP: "Workshop component.",
};

export function getCourseTypeLabel(type) {
  const code = String(type || "").trim().toUpperCase();
  const label = COURSE_TYPE_LABELS[code];
  return label ? `${label} (${code})` : code;
}

export function getCourseTypeDescription(type) {
  const code = String(type || "").trim().toUpperCase();
  return COURSE_TYPE_DESCRIPTIONS[code] || COURSE_TYPE_LABELS[code] || "";
}
export const YEARS = [1, 2, 3, 4];
export const CREDITS = [0.5, 1, 1.5, 2, 3, 4, 4.5, 6, 9];

export const DAY_LABELS = {
  M: "Monday",
  T: "Tuesday",
  W: "Wednesday",
  R: "Thursday",
  F: "Friday",
  S: "Saturday",
  U: "Sunday",
};

export const DAYS = ["M", "T", "W", "R", "F", "S", "U"];

export const TIME_BUCKETS = [
  { key: "Morning", label: "Morning (Before 12:00 PM)", test: (mins) => mins >= 0 && mins < 12 * 60 },
  { key: "Afternoon", label: "Afternoon (12:00 PM - 5:00 PM)", test: (mins) => mins >= 12 * 60 && mins < 17 * 60 },
  { key: "Evening", label: "Evening (5:00 PM & Later)", test: (mins) => mins >= 17 * 60 },
];

export function buildCoursesURL() {
  const base = import.meta.env.VITE_API_BASE;
  if (!base) return "/data/electives.json";

  const terms = TERMS.map(t => `terms=${t}`).join('&');
  const types = COURSE_TYPES.map(t => `types=${t}`).join('&');
  const years = YEARS.map(y => `years=${y}`).join('&');
  const depts = DEPARTMENTS.map(d => `depts=${d}`).join('&');
  const facs = FACULTIES.map(f => `faculties=${f}`).join('&');
  const credits = CREDITS.map(c => `credits=${c}`).join('&');

  return `${base}/courses?${terms}&${types}&${years}&${depts}&${facs}&${credits}`;
}
