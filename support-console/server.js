// support-console/server.js
// HTTP server for operator console UI

const http = require('http');
const fs = require('fs');
const path = require('path');
const store = require('../runtime/store');

const PORT = 3003;
const UI_DIR = path.join(__dirname, 'ui');
const RUNBOOKS_DIR = path.join(__dirname, '..', 'runbooks');
const ARTIFACTS_DIR = path.join(__dirname, '..', 'artifacts', 'incidents');

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Cache-busting headers (CRITICAL per BUILD_STANDARD)
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  try {
    // Serve UI
    if (pathname === '/' && req.method === 'GET') {
      const htmlPath = path.join(UI_DIR, 'index.html');
      if (fs.existsSync(htmlPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fs.readFileSync(htmlPath, 'utf8'));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('UI not found. Run: node support-console/server.js');
      }
      return;
    }

    // API: Get incidents
    if (pathname === '/api/incidents' && req.method === 'GET') {
      const incidents = store.getPromotedIncidents();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(incidents));
      return;
    }

    // API: Get health
    if (pathname === '/api/health' && req.method === 'GET') {
      const health = store.getComponentHealth();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health));
      return;
    }

    // API: Get incident artifact
    const incidentMatch = pathname.match(/^\/api\/incidents\/([^\/]+)\/(.+\.json|\.md)$/);
    if (incidentMatch && req.method === 'GET') {
      const [, incidentId, filename] = incidentMatch;
      const filePath = path.join(ARTIFACTS_DIR, incidentId, filename);

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const contentType = filename.endsWith('.json') ? 'application/json' : 'text/markdown';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Artifact not found' }));
      }
      return;
    }

    // API: Runbooks
    const runbookMatch = pathname.match(/^\/runbooks\/(.+\.md)$/);
    if (runbookMatch && req.method === 'GET') {
      const runbookName = runbookMatch[1];
      const runbookPath = path.join(RUNBOOKS_DIR, runbookName);

      if (fs.existsSync(runbookPath)) {
        res.writeHead(200, { 'Content-Type': 'text/markdown' });
        res.end(fs.readFileSync(runbookPath, 'utf8'));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Runbook not found' }));
      }
      return;
    }

    // API: Simulate JWKS rotation
    if (pathname === '/api/simulate/jwks-rotation' && req.method === 'POST') {
      const injectPath = path.join(__dirname, '..', 'scenarios', 'jwks-rotation-failure', 'inject.js');
      if (fs.existsSync(injectPath)) {
        require(injectPath).injectJWKSRotationFailure();
      } else {
        // Inline simulation
        simulateJWKSRotation();
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, scenario: 'jwks-rotation' }));
      return;
    }

    // API: Simulate RLS bypass
    if (pathname === '/api/simulate/rls-bypass' && req.method === 'POST') {
      const injectPath = path.join(__dirname, '..', 'scenarios', 'rls-bypass', 'inject.js');
      if (fs.existsSync(injectPath)) {
        require(injectPath).injectRLSBypass();
      } else {
        simulateRLSBypass();
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, scenario: 'rls-bypass' }));
      return;
    }

    // API: Simulate cross-tenant
    if (pathname === '/api/simulate/cross-tenant' && req.method === 'POST') {
      const injectPath = path.join(__dirname, '..', 'scenarios', 'cross-tenant-exposure', 'inject.js');
      if (fs.existsSync(injectPath)) {
        require(injectPath).injectCrossTenantExposure();
      } else {
        simulateCrossTenant();
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, scenario: 'cross-tenant' }));
      return;
    }

  // API: Audit JWKS
  if (pathname === '/api/audit/jwks' && req.method === 'POST') {
    const auditPath = path.join(__dirname, '..', 'auditors', 'jwks-rotation-audit.js');
    const AUDIT_DIR = path.join(__dirname, '..', 'artifacts', 'audits');
    let report = { success: true, audit: 'jwks', checks: [] };
    
    if (fs.existsSync(auditPath)) {
      const auditor = require(auditPath);
      auditor.runJWKSAudit();
      
      // Read the generated report
      const reportFile = path.join(AUDIT_DIR, `jwks-audit-${new Date().toISOString().split('T')[0]}.json`);
      if (fs.existsSync(reportFile)) {
        report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
        report.report_path = `/artifacts/audits/jwks-audit-${new Date().toISOString().split('T')[0]}.json`;
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(report));
    return;
  }

  // API: Audit tenants
  if (pathname === '/api/audit/tenants' && req.method === 'POST') {
    const auditPath = path.join(__dirname, '..', 'auditors', 'tenant-isolation-audit.js');
    const AUDIT_DIR = path.join(__dirname, '..', 'artifacts', 'audits');
    let report = { success: true, audit: 'tenants', checks: [] };
    
    if (fs.existsSync(auditPath)) {
      const auditor = require(auditPath);
      auditor.runTenantAudit();
      
      // Read the generated report
      const reportFile = path.join(AUDIT_DIR, `tenant-audit-${new Date().toISOString().split('T')[0]}.json`);
      if (fs.existsSync(reportFile)) {
        report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
        report.report_path = `/artifacts/audits/tenant-audit-${new Date().toISOString().split('T')[0]}.json`;
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(report));
    return;
  }

  // API: Audit entitlements
  if (pathname === '/api/audit/entitlements' && req.method === 'POST') {
    const auditPath = path.join(__dirname, '..', 'auditors', 'entitlement-audit.js');
    const AUDIT_DIR = path.join(__dirname, '..', 'artifacts', 'audits');
    let report = { success: true, audit: 'entitlements', checks: [] };
    
    if (fs.existsSync(auditPath)) {
      const auditor = require(auditPath);
      auditor.runEntitlementAudit();
      
      // Read the generated report
      const reportFile = path.join(AUDIT_DIR, `entitlement-audit-${new Date().toISOString().split('T')[0]}.json`);
      if (fs.existsSync(reportFile)) {
        report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
        report.report_path = `/artifacts/audits/entitlement-audit-${new Date().toISOString().split('T')[0]}.json`;
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(report));
    return;
  }

    // API: Reset
    if (pathname === '/api/reset' && req.method === 'POST') {
      store.resetRuntime();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));

  } catch (error) {
    console.error('Console server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

// Inline simulations (fallback when inject scripts don't exist)
function simulateJWKSRotation() {
  store.setScenarioMode('jwks-rotation');

  // Rotate key
  const jwksState = store.getJWKSState();
  const oldKid = jwksState.current_kid;
  const keyNum = parseInt(oldKid.split('_')[2]) + 1;
  const newKid = `key_2026_${String(keyNum).padStart(3, '0')}`;

  jwksState.rotation_history.push({
    from_kid: oldKid,
    to_kid: newKid,
    rotated_at: new Date().toISOString()
  });
  jwksState.previous_kid = oldKid;
  jwksState.current_kid = newKid;
  jwksState.cache_stale_validators = 7;
  store.setJWKSState(jwksState);

  // Log auth failures
  for (let i = 0; i < 10; i++) {
    store.logEvent({
      id: `evt_${Date.now()}_${i}`,
      timestamp: new Date().toISOString(),
      service: 'auth',
      severity: i < 2 ? 'critical' : 'error',
      message: `JWT signature validation failed: kid=${newKid} not in cache`,
      correlation_key: 'jwks-rotation',
      tenant_id: `tenant_${i}`
    });
  }

  store.updateComponentHealth('auth', 'degraded');
  store.updateComponentHealth('jwks-server', 'degraded');
}

function simulateRLSBypass() {
  store.setScenarioMode('rls-bypass');

  const tenantState = store.getTenantState();
  tenantState.exposed_keys.push({
    key_type: 'service_role',
    exposed_in: 'frontend_bundle.js',
    exposed_at: new Date().toISOString()
  });
  store.setTenantState(tenantState);

  for (let i = 0; i < 5; i++) {
    store.logEvent({
      id: `evt_${Date.now()}_${i}`,
      timestamp: new Date().toISOString(),
      service: 'api',
      severity: 'critical',
      message: `Cross-tenant query detected using exposed service_role key`,
      correlation_key: 'rls-bypass',
      tenant_id: `victim_tenant_${i}`
    });
  }

  store.updateComponentHealth('auth', 'down');
  store.updateComponentHealth('database', 'down');
}

function simulateCrossTenant() {
  store.setScenarioMode('cross-tenant');

  const tenantState = store.getTenantState();

  for (let i = 0; i < 8; i++) {
    const sourceTenant = `tenant_${i}`;
    const victimTenant = `tenant_${(i + 1) % 8}`;

    tenantState.cross_tenant_violations.push({
      timestamp: new Date().toISOString(),
      source_tenant: sourceTenant,
      visible_to: victimTenant,
      query: 'list_customer_orders'
    });

    store.logEvent({
      id: `evt_${Date.now()}_${i}`,
      timestamp: new Date().toISOString(),
      service: 'api',
      severity: 'critical',
      message: `Cross-tenant data returned by query list_customer_orders - missing tenant_id filter`,
      correlation_key: 'cross-tenant-exposure',
      tenant_id: sourceTenant
    });
  }

  store.setTenantState(tenantState);
  store.updateComponentHealth('api', 'degraded');
  store.updateComponentHealth('database', 'degraded');
}

server.listen(PORT, () => {
  console.log(`Support console running on port ${PORT}`);
  console.log(`  Open: http://localhost:${PORT}`);
});
