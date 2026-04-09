// scenarios/jwks-rotation-failure/inject.js
// Simulates JWKS key rotation failure

const store = require('../../runtime/store');

function injectJWKSRotationFailure() {
  console.log('Injecting JWKS rotation failure scenario...');

  // Set scenario mode
  store.setScenarioMode('jwks-rotation');

  // Simulate key rotation
  const jwksState = store.getJWKSState();
  const oldKid = jwksState.current_kid;
  const keyNum = parseInt(oldKid.split('_')[2]) + 1;
  const newKid = `key_2026_${String(keyNum).padStart(3, '0')}`;

  // Record rotation
  jwksState.rotation_history.push({
    from_kid: oldKid,
    to_kid: newKid,
    rotated_at: new Date().toISOString()
  });

  jwksState.previous_kid = oldKid;
  jwksState.current_kid = newKid;
  jwksState.cache_stale_validators = 7;

  store.setJWKSState(jwksState);

  // Log key rotation event
  store.logEvent({
    id: `evt_${Date.now()}_rotation`,
    timestamp: new Date().toISOString(),
    service: 'jwks-server',
    severity: 'info',
    message: `Key rotation initiated: ${oldKid} -> ${newKid}`,
    correlation_key: 'jwks-rotation',
    old_kid: oldKid,
    new_kid: newKid
  });

  // Simulate auth failures from stale cache
  for (let i = 0; i < 10; i++) {
    store.logEvent({
      id: `evt_${Date.now()}_${i}_auth_fail`,
      timestamp: new Date().toISOString(),
      service: 'auth',
      severity: i < 2 ? 'critical' : 'error',
      message: `JWT signature validation failed: kid=${newKid} not in cache`,
      correlation_key: 'jwks-rotation',
      tenant_id: `tenant_${i}`,
      error_type: 'jwt_signature_invalid'
    });
  }

  // Log auth failure spike
  store.logEvent({
    id: `evt_${Date.now()}_spike`,
    timestamp: new Date().toISOString(),
    service: 'auth',
    severity: 'critical',
    message: 'Auth failure rate spike: 92% of requests failing',
    correlation_key: 'jwks-rotation',
    failure_rate: 92
  });

  // Update component health
  store.updateComponentHealth('auth', 'degraded');
  store.updateComponentHealth('jwks-server', 'degraded');

  console.log('JWKS rotation failure scenario injected successfully');
  console.log(`  Old key: ${oldKid}`);
  console.log(`  New key: ${newKid}`);
  console.log(`  Validators with stale cache: 7`);
  console.log(`  Affected tenants: 10`);

  return {
    success: true,
    scenario: 'jwks-rotation',
    details: {
      old_kid: oldKid,
      new_kid: newKid,
      validators_with_stale_cache: 7,
      affected_tenants: 10
    }
  };
}

// Run if called directly
if (require.main === module) {
  injectJWKSRotationFailure();
}

module.exports = { injectJWKSRotationFailure };
