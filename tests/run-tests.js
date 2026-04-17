// tests/run-tests.js
// Unit tests for identity guardian

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Ensure we're testing the right module
const storePath = path.join(__dirname, '..', 'runtime', 'store.js');
const store = require(storePath);

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

console.log('\n=== Unit Tests ===\n');

// Reset before tests
store.resetRuntime();

// JWKS State Tests
console.log('JWKS State:');
test('JWKS state initialized', () => {
  const state = store.getJWKSState();
  assert(state.current_kid, 'Should have current_kid');
  assert(state.active_keys || state.keys, 'Should have keys array');
});

test('JWKS state can be updated', () => {
  const state = store.getJWKSState();
  state.cache_stale_validators = 5;
  store.setJWKSState(state);
  const updated = store.getJWKSState();
  assert.strictEqual(updated.cache_stale_validators, 5);
});

// Tenant State Tests
console.log('\nTenant State:');
test('Tenant state initialized', () => {
  const state = store.getTenantState();
  assert(Array.isArray(state.exposed_keys), 'Should have exposed_keys array');
  assert(Array.isArray(state.cross_tenant_violations), 'Should have cross_tenant_violations array');
});

test('Tenant state can track exposed keys', () => {
  const state = store.getTenantState();
  state.exposed_keys.push({ key_type: 'service_role', exposed_in: 'test.js' });
  store.setTenantState(state);
  const updated = store.getTenantState();
  assert.strictEqual(updated.exposed_keys.length, 1);
});

// Event Logging Tests
console.log('\nEvent Logging:');
test('Can log events', () => {
  store.logEvent({
    id: 'test_evt_001',
    timestamp: new Date().toISOString(),
    service: 'test',
    severity: 'info',
    message: 'Test event'
  });
  const events = store.getNewEvents(0);
  assert(events.length > 0, 'Should have events');
});

// Component Health Tests
console.log('\nComponent Health:');
test('Component health initialized', () => {
  const health = store.getComponentHealth();
  assert(health.api, 'Should have api health');
  assert(health.auth, 'Should have auth health');
});

test('Component health can be updated', () => {
  store.updateComponentHealth('api', 'degraded');
  const health = store.getComponentHealth();
  assert.strictEqual(health.api, 'degraded');
});

// Scenario Mode Tests
console.log('\nScenario Mode:');
test('Scenario mode can be set', () => {
  store.setScenarioMode('test-scenario');
  const mode = store.getScenarioMode();
  assert.strictEqual(mode, 'test-scenario');
});

// Reset Test
console.log('\nReset:');
test('Reset clears state', () => {
  store.logEvent({ id: 'test_reset', timestamp: new Date().toISOString(), service: 'test', severity: 'info', message: 'Before reset' });
  store.resetRuntime();
  const events = store.getNewEvents(0);
  assert.strictEqual(events.length, 0, 'Events should be cleared');
});

// SAML State Tests
console.log('\nSAML State:');
test('SAML state initialized with okta-style vendor flavor', () => {
  const state = store.getSAMLState();
  assert.strictEqual(state.vendor_flavor, 'okta-style', 'Should have okta-style vendor flavor');
});

test('SAML state has required fields', () => {
  const state = store.getSAMLState();
  assert(state.hasOwnProperty('last_assertion_review'), 'Should have last_assertion_review');
  assert(state.hasOwnProperty('assertion_audience_status'), 'Should have assertion_audience_status');
  assert(state.hasOwnProperty('signature_valid'), 'Should have signature_valid');
  assert(state.hasOwnProperty('attribute_mapping_complete'), 'Should have attribute_mapping_complete');
  assert(Array.isArray(state.mapping_failures), 'Should have mapping_failures array');
  assert(state.hasOwnProperty('last_metadata_refresh'), 'Should have last_metadata_refresh');
});

test('SAML state can be updated', () => {
  const state = store.getSAMLState();
  state.assertion_audience_status = 'invalid';
  state.signature_valid = false;
  store.setSAMLState(state);
  const updated = store.getSAMLState();
  assert.strictEqual(updated.assertion_audience_status, 'invalid');
  assert.strictEqual(updated.signature_valid, false);
});

// SCIM State Tests
console.log('\nSCIM State:');
test('SCIM state initialized with okta-style vendor flavor', () => {
  const state = store.getSCIMState();
  assert.strictEqual(state.vendor_flavor, 'okta-style', 'Should have okta-style vendor flavor');
});

test('SCIM state has required fields', () => {
  const state = store.getSCIMState();
  assert(state.hasOwnProperty('last_provisioning_sync'), 'Should have last_provisioning_sync');
  assert(state.hasOwnProperty('provision_status'), 'Should have provision_status');
  assert(state.hasOwnProperty('deprovision_status'), 'Should have deprovision_status');
  assert(state.hasOwnProperty('group_sync_status'), 'Should have group_sync_status');
  assert(state.hasOwnProperty('role_sync_status'), 'Should have role_sync_status');
  assert(Array.isArray(state.provisioning_drift), 'Should have provisioning_drift array');
  assert(Array.isArray(state.last_sync_errors), 'Should have last_sync_errors array');
});

test('SCIM state can be updated', () => {
  const state = store.getSCIMState();
  state.provision_status = 'failed';
  state.group_sync_status = 'mismatch';
  store.setSCIMState(state);
  const updated = store.getSCIMState();
  assert.strictEqual(updated.provision_status, 'failed');
  assert.strictEqual(updated.group_sync_status, 'mismatch');
});

// SAML Scenario Injection Tests
console.log('\nSAML Scenario Injection:');
const { injectSAMLFailure } = require('../scenarios/saml-failure/inject.js');

test('SAML scenario injection sets correct state', () => {
  store.resetRuntime();
  const result = injectSAMLFailure();
  assert.strictEqual(result.success, true, 'Injection should succeed');
  assert.strictEqual(result.scenario, 'saml-config-drift', 'Should set saml-config-drift scenario');
  assert.strictEqual(result.details.audience_status, 'invalid', 'Audience status should be invalid');
  assert.strictEqual(result.details.signature_valid, false, 'Signature should be invalid');
  assert.strictEqual(result.details.attribute_mapping_complete, false, 'Attribute mapping should be incomplete');
  assert.strictEqual(result.details.mapping_failures_count, 2, 'Should have 2 mapping failures');
  assert.strictEqual(result.details.vendor_flavor, 'okta-style', 'Should use okta-style vendor flavor');
});

test('SAML scenario updates SAML state correctly', () => {
  store.resetRuntime();
  injectSAMLFailure();
  const state = store.getSAMLState();
  assert.strictEqual(state.assertion_audience_status, 'invalid', 'Audience status should be invalid');
  assert.strictEqual(state.signature_valid, false, 'Signature should be invalid');
  assert.strictEqual(state.attribute_mapping_complete, false, 'Attribute mapping should be incomplete');
  assert.strictEqual(state.mapping_failures.length, 2, 'Should have 2 mapping failures');
});

test('SAML scenario logs correlation events', () => {
  store.resetRuntime();
  injectSAMLFailure();
  const events = store.getNewEvents(0);
  const samlEvents = events.filter(e => e.correlation_key === 'saml-config-drift');
  assert(samlEvents.length >= 5, 'Should have at least 5 SAML correlation events');
});

// SCIM Scenario Injection Tests
console.log('\nSCIM Scenario Injection:');
const { injectSCIMFailure } = require('../scenarios/scim-failure/inject.js');

test('SCIM scenario injection sets correct state', () => {
  store.resetRuntime();
  const result = injectSCIMFailure();
  assert.strictEqual(result.success, true, 'Injection should succeed');
  assert.strictEqual(result.scenario, 'scim-provisioning-drift', 'Should set scim-provisioning-drift scenario');
  assert.strictEqual(result.details.provision_status, 'failed', 'Provision status should be failed');
  assert.strictEqual(result.details.deprovision_status, 'degraded', 'Deprovision status should be degraded');
  assert.strictEqual(result.details.group_sync_status, 'mismatch', 'Group sync should be mismatch');
  assert.strictEqual(result.details.role_sync_status, 'mismatch', 'Role sync should be mismatch');
});

test('SCIM scenario updates SCIM state correctly', () => {
  store.resetRuntime();
  injectSCIMFailure();
  const state = store.getSCIMState();
  assert.strictEqual(state.provision_status, 'failed', 'Provision status should be failed');
  assert.strictEqual(state.deprovision_status, 'degraded', 'Deprovision status should be degraded');
  assert.strictEqual(state.group_sync_status, 'mismatch', 'Group sync should be mismatch');
  assert.strictEqual(state.role_sync_status, 'mismatch', 'Role sync should be mismatch');
  assert.strictEqual(state.provisioning_drift.length, 2, 'Should have 2 drift entries');
  assert.strictEqual(state.last_sync_errors.length, 3, 'Should have 3 sync errors');
});

test('SCIM scenario logs correlation events', () => {
  store.resetRuntime();
  injectSCIMFailure();
  const events = store.getNewEvents(0);
  const scimEvents = events.filter(e => e.correlation_key === 'scim-provisioning-drift');
  assert(scimEvents.length >= 5, 'Should have at least 5 SCIM correlation events');
});

// Correlation Tests
console.log('\nCorrelation:');
const { correlateEvents, checkPromotion } = require('../intelligence-core/correlation/bucket');

test('Correlation groups events by key', () => {
  const events = [
    { id: 'e1', timestamp: new Date().toISOString(), service: 'api', severity: 'error', message: 'Error 1', correlation_key: 'test' },
    { id: 'e2', timestamp: new Date().toISOString(), service: 'api', severity: 'error', message: 'Error 2', correlation_key: 'test' }
  ];
  const result = correlateEvents(events, {});
  assert(result.active['test'], 'Should create bucket for test key');
});

test('Promotion triggers at threshold', () => {
  const events = [];
  for (let i = 0; i < 6; i++) {
    events.push({
      id: `e${i}`,
      timestamp: new Date().toISOString(),
      service: 'api',
      severity: 'error',
      message: `Error ${i}`,
      correlation_key: 'promote'
    });
  }
  const result = correlateEvents(events, {});
  assert(result.promoted.length > 0, 'Should promote at 5+ events');
});

// Summary
console.log(`\n${passed} tests passed, ${failed} tests failed\n`);

if (failed > 0) {
  process.exit(1);
}
