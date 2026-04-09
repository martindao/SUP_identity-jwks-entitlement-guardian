// intelligence-core/evidence/snapshot.js
// Captures identity-specific evidence at incident promotion time

const crypto = require('crypto');
const store = require('../../runtime/store');

function captureEvidence(incident) {
  const capturedAt = new Date().toISOString();
  
  // Get all relevant state from runtime store
  const jwksState = store.getJWKSState();
  const tenantState = store.getTenantState();
  const componentHealth = store.getComponentHealth();
  const recentLogs = store.getNewEvents(0).slice(-20);
  
  // Calculate auth failure metrics from recent logs
  const authFailureMetrics = calculateAuthFailureMetrics(recentLogs);
  
  // Build evidence bundle
  const evidence = {
    incident_id: incident.id,
    captured_at: capturedAt,
    checksum: '', // Will be set after serialization
    scenario_id: incident.scenario_id,
    component_health: componentHealth,
    
    // JWKS-specific evidence
    jwks_state: {
      current_kid: jwksState.current_kid,
      previous_kid: jwksState.previous_kid || jwksState.rotation_history.slice(-1)[0]?.from_kid,
      rotation_age_seconds: jwksState.rotation_history.length > 0 ? 
        Math.floor((Date.now() - new Date(jwksState.rotation_history.slice(-1)[0].rotated_at).getTime()) / 1000) : 0,
      validators_with_stale_cache: jwksState.cache_stale_validators || 0,
      active_keys_count: jwksState.keys ? jwksState.keys.length : 1
    },
    
    // Auth failure metrics
    auth_failure_metrics: authFailureMetrics,
    
    // Affected tenants
    affected_tenants: incident.affected_tenants || [],
    
    // Exposed keys (for RLS bypass)
    exposed_keys: tenantState.exposed_keys || [],
    
    // Cross-tenant violations
    cross_tenant_violations: tenantState.cross_tenant_violations || [],
    
    // Compliance impact
    compliance_impact: incident.compliance_impact,
    
    // Recent logs
    recent_logs: recentLogs.slice(-10).map(e => ({
      timestamp: e.timestamp,
      level: e.severity,
      message: e.message
    })),
    
    // Triggering events
    triggering_events: incident.correlated_events || [],
    
    // Recommended action based on scenario
    recommended_action: getRecommendedAction(incident.scenario_id)
  };
  
  // Calculate checksum for evidence integrity
  evidence.checksum = generateChecksum(evidence);
  
  return evidence;
}

function calculateAuthFailureMetrics(logs) {
  const authFailures = logs.filter(e => 
    e.message && (
      e.message.includes('JWT') ||
      e.message.includes('auth') ||
      e.message.includes('validation failed') ||
      e.message.includes('signature')
    )
  );
  
  const uniqueTenants = new Set(authFailures.map(e => e.tenant_id).filter(Boolean));
  
  return {
    failures_last_minute: authFailures.length,
    unique_tenants_affected: uniqueTenants.size,
    failure_rate_pct: logs.length > 0 ? Math.round((authFailures.length / logs.length) * 100) : 0,
    error_type: detectErrorType(authFailures)
  };
}

function detectErrorType(failures) {
  const messages = failures.map(e => e.message || '').join(' ').toLowerCase();
  
  if (messages.includes('signature')) return 'jwt_signature_invalid';
  if (messages.includes('expired')) return 'jwt_expired';
  if (messages.includes('invalid')) return 'jwt_invalid';
  return 'auth_failure';
}

function getRecommendedAction(scenarioId) {
  const actions = {
    'jwks-rotation-failure': 'Force JWKS cache refresh on all validators within 60 seconds',
    'rls-bypass': '1. Rotate service role key immediately. 2. Audit logs for unauthorized queries. 3. Notify affected customers per breach policy.',
    'cross-tenant-exposure': '1. Disable endpoint immediately. 2. Audit access logs. 3. Notify legal/compliance team. 4. Patch query with tenant filter.'
  };
  
  return actions[scenarioId] || 'Review incident timeline and component health for diagnosis.';
}

function generateChecksum(evidence) {
  const serialized = JSON.stringify({
    incident_id: evidence.incident_id,
    captured_at: evidence.captured_at,
    scenario_id: evidence.scenario_id,
    component_health: evidence.component_health,
    jwks_state: evidence.jwks_state,
    affected_tenants: evidence.affected_tenants
  });
  
  return 'sha256:' + crypto.createHash('sha256').update(serialized).digest('hex').substring(0, 16);
}

module.exports = { captureEvidence };
