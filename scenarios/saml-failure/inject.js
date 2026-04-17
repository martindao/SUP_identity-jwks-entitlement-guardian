// scenarios/saml-failure/inject.js
// Simulates SAML configuration drift failure (audience, signature, attribute mapping)

const store = require('../../runtime/store');

function injectSAMLFailure() {
  console.log('Injecting SAML configuration drift scenario...');

  // Set scenario mode
  store.setScenarioMode('saml-config-drift');

  // Get current SAML state
  const samlState = store.getSAMLState();

  // Simulate configuration drift - all three failure modes
  samlState.assertion_audience_status = 'invalid';
  samlState.signature_valid = false;
  samlState.attribute_mapping_complete = false;
  samlState.mapping_failures = [
    { attribute: 'okta.userName', error: 'Expected email format, received username' },
    { attribute: 'okta.groups', error: 'Required group "Admins" not found in assertion' }
  ];
  samlState.last_assertion_review = new Date().toISOString();

  store.setSAMLState(samlState);

  // Log audience mismatch event
  store.logEvent({
    id: `evt_${Date.now()}_audience_mismatch`,
    timestamp: new Date().toISOString(),
    service: 'saml-sp',
    severity: 'critical',
    message: 'SAML audience restriction validation failed: expected https://app.example.com/saml/acs, received https://wrong-sp.example.com',
    correlation_key: 'saml-config-drift',
    error_type: 'saml_audience_mismatch',
    expected_audience: 'https://app.example.com/saml/acs',
    actual_audience: 'https://wrong-sp.example.com'
  });

  // Log signature/certificate failure event
  store.logEvent({
    id: `evt_${Date.now()}_signature_invalid`,
    timestamp: new Date().toISOString(),
    service: 'saml-sp',
    severity: 'critical',
    message: 'SAML signature validation failed: certificate expired or signature algorithm mismatch',
    correlation_key: 'saml-config-drift',
    error_type: 'saml_signature_invalid',
    certificate_status: 'expired',
    signature_algorithm: 'rsa-sha1',
    expected_algorithm: 'rsa-sha256'
  });

  // Log attribute mapping failure events
  store.logEvent({
    id: `evt_${Date.now()}_attr_mapping_1`,
    timestamp: new Date().toISOString(),
    service: 'saml-sp',
    severity: 'error',
    message: 'SAML attribute mapping failed: okta.userName - Expected email format, received username',
    correlation_key: 'saml-config-drift',
    error_type: 'saml_attribute_mapping_failure',
    attribute_name: 'okta.userName',
    expected_format: 'email',
    actual_value: 'jsmith'
  });

  store.logEvent({
    id: `evt_${Date.now()}_attr_mapping_2`,
    timestamp: new Date().toISOString(),
    service: 'saml-sp',
    severity: 'error',
    message: 'SAML attribute mapping failed: okta.groups - Required group "Admins" not found in assertion',
    correlation_key: 'saml-config-drift',
    error_type: 'saml_attribute_mapping_failure',
    attribute_name: 'okta.groups',
    expected_groups: ['Admins', 'Users'],
    actual_groups: ['Users', 'Developers']
  });

  // Simulate auth failures from SAML issues
  for (let i = 0; i < 8; i++) {
    store.logEvent({
      id: `evt_${Date.now()}_${i}_saml_auth_fail`,
      timestamp: new Date().toISOString(),
      service: 'auth',
      severity: i < 3 ? 'critical' : 'error',
      message: `SAML authentication failed: assertion validation error for user_${i}`,
      correlation_key: 'saml-config-drift',
      tenant_id: `tenant_${i}`,
      error_type: 'saml_assertion_invalid'
    });
  }

  // Log auth failure spike
  store.logEvent({
    id: `evt_${Date.now()}_saml_spike`,
    timestamp: new Date().toISOString(),
    service: 'auth',
    severity: 'critical',
    message: 'SAML auth failure rate spike: 78% of SAML requests failing',
    correlation_key: 'saml-config-drift',
    failure_rate: 78,
    protocol: 'SAML'
  });

  // Update component health
  store.updateComponentHealth('auth', 'degraded');
  store.updateComponentHealth('saml-sp', 'degraded');

  console.log('SAML configuration drift scenario injected successfully');
  console.log('  Audience status: invalid');
  console.log('  Signature valid: false');
  console.log('  Attribute mapping: incomplete');
  console.log('  Mapping failures: 2');
  console.log('  Affected tenants: 8');

  return {
    success: true,
    scenario: 'saml-config-drift',
    details: {
      audience_status: 'invalid',
      signature_valid: false,
      attribute_mapping_complete: false,
      mapping_failures_count: 2,
      affected_tenants: 8,
      vendor_flavor: 'okta-style'
    }
  };
}

// Run if called directly
if (require.main === module) {
  injectSAMLFailure();
}

module.exports = { injectSAMLFailure };
