import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BACKEND_ROOT = path.resolve(__dirname, '..');
export const PROJECT_ROOT = path.resolve(BACKEND_ROOT, '..');
export const DATA_DIR = path.join(BACKEND_ROOT, 'data');
export const FRONTEND_DATA_DIR = path.join(PROJECT_ROOT, 'frontend', 'yorku-elective-tracker', 'public', 'data');
export const VIEWS_DIR = path.join(BACKEND_ROOT, 'views');
export const STEP2_DIR = path.join(BACKEND_ROOT, 'step2_courseParsing');
export const RUNTIME_DIR = path.join(BACKEND_ROOT, 'runtime');
export const RUNTIME_STATE_DIR = path.join(RUNTIME_DIR, 'state');
export const RUNTIME_PIPELINE_DIR = path.join(RUNTIME_DIR, 'pipeline');
export const RUNTIME_REPORTS_DIR = path.join(RUNTIME_DIR, 'reports');

export const COUNT_FILE = path.join(RUNTIME_STATE_DIR, 'count.json');
export const API_USAGE_FILE = path.join(RUNTIME_STATE_DIR, 'apiUsage.json');
export const STEP13_FILE = path.join(STEP2_DIR, 'step13_coursesWithoutRealPrereqs.json');
export const STEP14_FILE = path.join(STEP2_DIR, 'step14_uniqueValues.json');
export const TRENDING_FILE = path.join(RUNTIME_STATE_DIR, 'trending.json');
export const PIPELINE_LOG_FILE = path.join(RUNTIME_PIPELINE_DIR, 'pipeline.log');
export const PIPELINE_HARDCOPY_FILE = path.join(RUNTIME_PIPELINE_DIR, 'hardcopy.0');
export const FRONTEND_ELECTIVES_FILE = path.join(FRONTEND_DATA_DIR, 'electives.json');
export const FRONTEND_COURSE_META_FILE = path.join(FRONTEND_DATA_DIR, 'course_meta.json');
