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
export const COURSE_TYPES = ['LECT', 'SEMR', 'TUTR', 'LAB', 'BLEN', 'ONLN', 'ONCA', 'HYFX'];
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
