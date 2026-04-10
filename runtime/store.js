// runtime/store.js
// File-backed shared state store for cross-process communication
// All services read/write through this layer instead of in-memory shared objects

const fs = require('fs');
const path = require('path');

const RUNTIME_DIR = path.join(__dirname);
const JWKS_STATE_FILE = path.join(RUNTIME_DIR, 'jwks-state.json');
const TENANT_STATE_FILE = path.join(RUNTIME_DIR, 'tenant-state.json');
const HEALTH_FILE = path.join(RUNTIME_DIR, 'component-health.json');
const LOGS_FILE = path.join(RUNTIME_DIR, 'logs.ndjson');
const SCENARIO_FILE = path.join(RUNTIME_DIR, 'scenario-mode.json');
const INCIDENTS_DIR = path.join(RUNTIME_DIR, '..', 'artifacts', 'incidents');

// --- Helpers ---

function readJSON(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function appendNDJSON(filePath, entry) {
  fs.appendFileSync(filePath, JSON.stringify(entry) + '\n', 'utf8');
}

function readNDJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (!content) return [];
    return content.split('\n').map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

// --- JWKS State ---

function getJWKSState() {
  return readJSON(JWKS_STATE_FILE, {
    current_kid: 'key_2026_001',
    previous_kid: null,
    rotation_history: [],
    cache_status: {
      validators_with_stale_cache: 0,
      last_refresh: new Date().toISOString()
    },
    active_keys: [
      { kid: 'key_2026_001', status: 'active', created_at: new Date().toISOString() }
    ]
  });
}

function setJWKSState(state) {
  writeJSON(JWKS_STATE_FILE, state);
}

function rotateJWKSKey(newKid) {
  const state = getJWKSState();
  const previousKid = state.current_kid;
  
  // Add current key to rotation history
  state.rotation_history.push({
    from_kid: previousKid,
    to_kid: newKid,
    rotated_at: new Date().toISOString()
  });
  
  // Update active keys
  state.active_keys = state.active_keys.map(key => {
    if (key.kid === previousKid) {
      return { ...key, status: 'rotating' };
    }
    return key;
  });
  
  // Add new key
  state.active_keys.push({
    kid: newKid,
    status: 'active',
    created_at: new Date().toISOString()
  });
  
  // Update current/previous
  state.previous_kid = previousKid;
  state.current_kid = newKid;
  
  setJWKSState(state);
  return state;
}

// --- Tenant State ---

function getTenantState() {
  return readJSON(TENANT_STATE_FILE, {
    tenants: [],
    exposed_keys: [],
    cross_tenant_violations: []
  });
}

function setTenantState(state) {
  writeJSON(TENANT_STATE_FILE, state);
}

// --- Component Health ---

function getComponentHealth() {
  return readJSON(HEALTH_FILE, {
    api: 'operational',
    auth: 'operational',
    'jwks-server': 'operational',
    database: 'operational'
  });
}

function updateComponentHealth(component, status) {
  const health = getComponentHealth();
  health[component] = status;
  writeJSON(HEALTH_FILE, health);
}

// --- Logs / Events ---

function logEvent(event) {
  const entry = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  };
  appendNDJSON(LOGS_FILE, entry);
}

function getNewEvents(sinceIndex) {
  const all = readNDJSON(LOGS_FILE);
  return all.slice(sinceIndex);
}

function getEventCount() {
  try {
    const content = fs.readFileSync(LOGS_FILE, 'utf8').trim();
    return content ? content.split('\n').length : 0;
  } catch {
    return 0;
  }
}

// --- Scenario Mode ---

function getScenarioMode() {
  return readJSON(SCENARIO_FILE, { mode: null }).mode;
}

function setScenarioMode(mode) {
  writeJSON(SCENARIO_FILE, { mode, set_at: new Date().toISOString() });
}

// --- Promoted Incidents ---

function getPromotedIncidents() {
  if (!fs.existsSync(INCIDENTS_DIR)) return [];
  
  const incidents = [];
  const dirs = fs.readdirSync(INCIDENTS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  for (const incidentId of dirs) {
    const incidentFile = path.join(INCIDENTS_DIR, incidentId, 'incident.json');
    if (fs.existsSync(incidentFile)) {
      incidents.push(readJSON(incidentFile, null));
    }
  }
  
  return incidents.filter(i => i !== null);
}

function addPromotedIncident(incident) {
  const incidentDir = path.join(INCIDENTS_DIR, incident.id);
  if (!fs.existsSync(incidentDir)) {
    fs.mkdirSync(incidentDir, { recursive: true });
  }
  
  const incidentFile = path.join(incidentDir, 'incident.json');
  writeJSON(incidentFile, incident);
  
  return incident;
}

function getIncidentById(id) {
  const incidentFile = path.join(INCIDENTS_DIR, id, 'incident.json');
  return readJSON(incidentFile, null);
}

// --- Reset ---

function resetRuntime() {
  // Reset JWKS state
  writeJSON(JWKS_STATE_FILE, {
    current_kid: 'key_2026_001',
    previous_kid: null,
    rotation_history: [],
    cache_status: {
      validators_with_stale_cache: 0,
      last_refresh: new Date().toISOString()
    },
    active_keys: [
      { kid: 'key_2026_001', status: 'active', created_at: new Date().toISOString() }
    ]
  });
  
  // Reset tenant state
  writeJSON(TENANT_STATE_FILE, {
    tenants: [],
    exposed_keys: [],
    cross_tenant_violations: []
  });
  
  // Reset component health
  writeJSON(HEALTH_FILE, {
    api: 'operational',
    auth: 'operational',
    'jwks-server': 'operational',
    database: 'operational'
  });
  
  // Clear logs
  fs.writeFileSync(LOGS_FILE, '', 'utf8');
  
  // Reset scenario mode
  writeJSON(SCENARIO_FILE, { mode: null });
  
  // Clear incidents directory
  if (fs.existsSync(INCIDENTS_DIR)) {
    fs.rmSync(INCIDENTS_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(INCIDENTS_DIR, { recursive: true });
}

// --- Initialize if missing ---

function ensureRuntimeFiles() {
  // JWKS state
  if (!fs.existsSync(JWKS_STATE_FILE)) {
    writeJSON(JWKS_STATE_FILE, {
      current_kid: 'key_2026_001',
      previous_kid: null,
      rotation_history: [],
      cache_status: {
        validators_with_stale_cache: 0,
        last_refresh: new Date().toISOString()
      },
      active_keys: [
        { kid: 'key_2026_001', status: 'active', created_at: new Date().toISOString() }
      ]
    });
  }
  
  // Tenant state
  if (!fs.existsSync(TENANT_STATE_FILE)) {
    writeJSON(TENANT_STATE_FILE, {
      tenants: [],
      exposed_keys: [],
      cross_tenant_violations: []
    });
  }
  
  // Component health
  if (!fs.existsSync(HEALTH_FILE)) {
    writeJSON(HEALTH_FILE, {
      api: 'operational',
      auth: 'operational',
      'jwks-server': 'operational',
      database: 'operational'
    });
  }
  
  // Logs file
  if (!fs.existsSync(LOGS_FILE)) {
    fs.writeFileSync(LOGS_FILE, '', 'utf8');
  }
  
  // Scenario mode
  if (!fs.existsSync(SCENARIO_FILE)) {
    writeJSON(SCENARIO_FILE, { mode: null });
  }
  
  // Incidents directory
  if (!fs.existsSync(INCIDENTS_DIR)) {
    fs.mkdirSync(INCIDENTS_DIR, { recursive: true });
  }
}

// Auto-initialize on module load
ensureRuntimeFiles();

module.exports = {
  // Helpers
  readJSON,
  writeJSON,
  appendNDJSON,
  readNDJSON,
  
  // JWKS State
  getJWKSState,
  setJWKSState,
  rotateJWKSKey,
  
  // Tenant State
  getTenantState,
  setTenantState,
  
  // Component Health
  getComponentHealth,
  updateComponentHealth,
  
  // Logs / Events
  logEvent,
  getNewEvents,
  getEventCount,
  
  // Scenario Mode
  getScenarioMode,
  setScenarioMode,
  
  // Promoted Incidents
  getPromotedIncidents,
  addPromotedIncident,
  getIncidentById,
  
  // Reset
  resetRuntime,
  ensureRuntimeFiles
};
