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

export const TERMS = ['F', 'W', 'S', 'Y'];
export const COURSE_TYPES = ['LECT', 'TUTR', 'LAB', 'PRA', 'SEM', 'BLEN', 'ONLN', 'ONCA', 'HYFX'];
export const YEARS = [1, 2, 3, 4];
export const CREDITS = [0.5, 1, 1.5, 2, 3, 4, 4.5, 6, 9, 12]; // Add all possible credit values

// Helper function - pass ALL values to get ALL popular courses
export function buildCoursesURL() {
  const terms = TERMS.map(t => `terms=${t}`).join('&');
  const types = COURSE_TYPES.map(t => `types=${t}`).join('&');
  const years = YEARS.map(y => `years=${y}`).join('&');
  const depts = DEPARTMENTS.map(d => `depts=${d}`).join('&');
  const facs = FACULTIES.map(f => `faculties=${f}`).join('&');
  const credits = CREDITS.map(c => `credits=${c}`).join('&');

 
}