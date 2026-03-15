import fs from 'fs';
import { API_USAGE_FILE } from './paths.js';

const USAGE_FILE = API_USAGE_FILE;

// Ensure data directory exists
const dataDir = path.dirname(USAGE_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function getToday() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function initializeUsageFile() {
  if (!fs.existsSync(USAGE_FILE)) {
    fs.writeFileSync(USAGE_FILE, JSON.stringify({}, null, 2));
  }
}

export function incrementApiUsage(endpoint) {
  initializeUsageFile();
  
  const today = getToday();
  
  try {
    const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
    
    // Initialize endpoint object if it doesn't exist
    if (!data[endpoint]) {
      data[endpoint] = {};
    }
    
    // Increment today's count
    if (!data[endpoint][today]) {
      data[endpoint][today] = 0;
    }
    data[endpoint][today]++;
    
    fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error updating API usage:', err);
  }
}

export function getApiUsage(endpoint) {
  initializeUsageFile();
  
  try {
    const data = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
    return data[endpoint] || {};
  } catch (err) {
    console.error('Error reading API usage:', err);
    return {};
  }
}

export function getAllApiUsage() {
  initializeUsageFile();
  
  try {
    return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading API usage:', err);
    return {};
  }
}
