// tests/integration.js
// Integration tests for identity guardian

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const store = require('../runtime/store');
const { promoteIncident } = require('../intelligence-core/promotion/engine');
const { captureEvidence } = require('../intelligence-core/evidence/snapshot');
const { generateTimeline } = require('../intelligence-core/summaries/timeline');
const { generateSummary } = require('../intelligence-core/summaries/summary');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\n=== Integration Tests ===\n');

// Reset
store.resetRuntime();

// Test JWKS Rotation Scenario
console.log('JWKS Rotation Scenario:');
test('Inject JWKS rotation failure', () => {
  const inject = require('../scenarios/jwks-rotation-failure/inject');
  const result = inject.injectJWKSRotationFailure();
  assert(result.success, 'Scenario should succeed');
  assert(result.details.new_kid, 'Should have new key ID');
});

test('Events are logged', () => {
  const events = store.getNewEvents(0);
  assert(events.length > 10, 'Should have 10+ events logged');
});

test('Component health updated', () => {
  const health = store.getComponentHealth();
  assert.strictEqual(health.auth, 'degraded', 'Auth should be degraded');
});

// Test RLS Bypass Scenario
console.log('\nRLS Bypass Scenario:');
store.resetRuntime();

test('Inject RLS bypass', () => {
  const inject = require('../scenarios/rls-bypass/inject');
  const result = inject.injectRLSBypass();
  assert(result.success);
  assert.strictEqual(result.details.exposed_key_type, 'service_role');
});

test('Cross-tenant violations tracked', () => {
  const tenantState = store.getTenantState();
  assert(tenantState.cross_tenant_violations.length > 0, 'Should have violations');
});

// Test Cross-Tenant Exposure Scenario
console.log('\nCross-Tenant Exposure Scenario:');
store.resetRuntime();

test('Inject cross-tenant exposure', () => {
  const inject = require('../scenarios/cross-tenant-exposure/inject');
  const result = inject.injectCrossTenantExposure();
  assert(result.success);
  assert.strictEqual(result.details.vulnerable_query, 'list_customer_orders');
});

// Test Auditor Scripts
console.log('\nAuditor Scripts:');
store.resetRuntime();

test('JWKS audit runs without error', () => {
  const audit = require('../auditors/jwks-rotation-audit');
  // Just require it - it runs automatically
  assert(true);
});

test('Tenant audit runs without error', () => {
  const audit = require('../auditors/tenant-isolation-audit');
  assert(true);
});

test('Entitlement audit runs without error', () => {
  const audit = require('../auditors/entitlement-audit');
  assert(true);
});

// Test Artifact Generation
console.log('\nArtifact Generation:');

test('Promotion creates incident', () => {
  store.resetRuntime();

  // Log enough events to trigger promotion
  for (let i = 0; i < 6; i++) {
    store.logEvent({
      id: `evt_test_${i}`,
      timestamp: new Date().toISOString(),
      service: 'api',
      severity: 'error',
      message: `Test error ${i}`,
      correlation_key: 'test-promotion',
      tenant_id: 'tenant_test'
    });
  }

  const bucket = {
    key: 'test-promotion',
    events: store.getNewEvents(0).slice(0, 6),
    services: new Set(['api']),
    severities: new Set(['error']),
    tenant_ids: new Set(['tenant_test'])
  };

  const incident = promoteIncident(bucket);
  assert(incident.id, 'Should have incident ID');
  assert(incident.title, 'Should have title');
});

test('Evidence capture works', () => {
  const incident = {
    id: 'test_inc',
    scenario_id: 'jwks-rotation-failure',
    affected_tenants: ['tenant_0'],
    compliance_impact: 'AUTH_OUTAGE',
    correlated_events: ['evt_1']
  };

  const evidence = captureEvidence(incident);
  assert(evidence.incident_id === 'test_inc', 'Should capture incident ID');
  assert(evidence.checksum, 'Should have checksum');
  assert(evidence.jwks_state, 'Should have JWKS state');
});

test('Timeline generation works', () => {
  const bucket = {
    events: [
      { id: 'e1', timestamp: new Date().toISOString(), service: 'api', severity: 'error', message: 'Test' }
    ]
  };
  const incident = { opened_at: new Date().toISOString(), title: 'Test' };

  const timeline = generateTimeline(bucket, incident);
  assert(Array.isArray(timeline), 'Should return array');
  assert(timeline.length > 0, 'Should have entries');
});

test('Summary generation works', () => {
  const incident = {
    id: 'test',
    title: 'Test Incident',
    severity: 'P1',
    status: 'open',
    opened_at: new Date().toISOString(),
    primary_service: 'api',
    compliance_impact: 'AUTH_OUTAGE',
    runbook_ref: 'runbooks/test.md',
    scenario_id: 'jwks-rotation-failure'
  };

  const evidence = {
    recommended_action: 'Test action',
    jwks_state: { current_kid: 'key_001', previous_kid: 'key_000', validators_with_stale_cache: 0 },
    affected_tenants: [],
    auth_failure_metrics: { failures_last_minute: 0 },
    exposed_keys: [],
    cross_tenant_violations: []
  };

  const timeline = [{ timestamp: new Date().toISOString(), message: 'Test' }];

  const summary = generateSummary(incident, evidence, timeline);
  assert(summary.includes('# Incident:'), 'Should have title');
  assert(summary.includes('Metadata'), 'Should have metadata');
});

// Reset→Simulate Flow Test
console.log('\nReset→Simulate Flow:');
test('Reset then simulate works', () => {
  store.resetRuntime();
  const inject = require('../scenarios/jwks-rotation-failure/inject');
  inject.injectJWKSRotationFailure();

  const events = store.getNewEvents(0);
  assert(events.length > 0, 'Should have events after simulation');
});

console.log(`\n${passed} tests passed, ${failed} tests failed\n`);

if (failed > 0) {
  process.exit(1);
}
