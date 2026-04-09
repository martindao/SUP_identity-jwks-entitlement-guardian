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
