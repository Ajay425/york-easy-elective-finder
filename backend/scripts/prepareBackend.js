import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  API_USAGE_FILE,
  COUNT_FILE,
  PIPELINE_HARDCOPY_FILE,
  PIPELINE_LOG_FILE,
  RUNTIME_PIPELINE_DIR,
  RUNTIME_REPORTS_DIR,
  RUNTIME_STATE_DIR,
  TRENDING_FILE,
  STEP13_FILE,
  STEP2_DIR,
} from '../utils/paths.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

const requiredDirs = [
  path.join(backendRoot, 'data'),
  path.join(STEP2_DIR, 'archive'),
  path.join(STEP2_DIR, 'logs'),
  RUNTIME_STATE_DIR,
  RUNTIME_PIPELINE_DIR,
  RUNTIME_REPORTS_DIR,
];

const requiredFiles = [
  {
    path: COUNT_FILE,
    defaultContent: JSON.stringify({ visits: 0 }, null, 2) + '\n',
  },
  {
    path: API_USAGE_FILE,
    defaultContent: JSON.stringify({}, null, 2) + '\n',
  },
  {
    path: TRENDING_FILE,
    defaultContent: JSON.stringify({}, null, 2) + '\n',
  },
  {
    path: STEP13_FILE,
    defaultContent: JSON.stringify({ courses: [] }, null, 2) + '\n',
  },
  {
    path: PIPELINE_LOG_FILE,
    defaultContent: '',
  },
];

const migratePairs = [
  {
    oldPath: path.join(backendRoot, 'data', 'count.json'),
    newPath: COUNT_FILE,
  },
  {
    oldPath: path.join(backendRoot, 'data', 'apiUsage.json'),
    newPath: API_USAGE_FILE,
  },
  {
    oldPath: path.join(backendRoot, 'socket-server', 'trending.json'),
    newPath: TRENDING_FILE,
  },
  {
    oldPath: path.join(backendRoot, 'pipeline.log'),
    newPath: PIPELINE_LOG_FILE,
  },
  {
    oldPath: path.join(backendRoot, 'hardcopy.0'),
    newPath: PIPELINE_HARDCOPY_FILE,
  },
];

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function ensureFile(filePath, defaultContent) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, defaultContent, 'utf-8');
  }
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function migrateFile(oldPath, newPath) {
  const oldExists = await pathExists(oldPath);
  if (!oldExists) return;

  const newExists = await pathExists(newPath);
  await fs.mkdir(path.dirname(newPath), { recursive: true });

  if (newExists) {
    const oldStat = await fs.stat(oldPath);
    if (oldStat.size === 0) {
      await fs.unlink(oldPath);
      return;
    }
  }

  if (!newExists) {
    await fs.rename(oldPath, newPath);
    return;
  }

  // Keep old copy if target already exists to avoid accidental data loss.
  const backupPath = `${oldPath}.migrated_backup`;
  await fs.rename(oldPath, backupPath);
}

async function main() {
  for (const dir of requiredDirs) {
    await ensureDir(dir);
  }

  for (const pair of migratePairs) {
    await migrateFile(pair.oldPath, pair.newPath);
  }

  for (const file of requiredFiles) {
    await ensureFile(file.path, file.defaultContent);
  }

  console.log('Backend local files prepared.');
}

main().catch((err) => {
  console.error('Failed to prepare backend files:', err);
  process.exit(1);
});
