// tests/fixtures/saml-scenario-fixture.js
// Node fixture for SAML scenario verification
// Produces incident with protocol: "SAML" and vendor_flavor: "okta-style"

const assert = require('assert');
const store = require('../../runtime/store');
const { promoteIncident } = require('../../intelligence-core/promotion/engine');

/**
 * Creates a SAML-like event bucket and promotes it to an incident.
 * Verifies that the incident has:
 * - protocol: "SAML"
 * - vendor_flavor: "okta-style"
 * - compliance_impact: "AUTH_CONFIG_DRIFT"
 * - scenario_id: "saml-config-drift"
 */
function testSAMLIncidentPromotion() {
  // Reset runtime to clean state
  store.resetRuntime();

  // Create SAML-like events (Okta-style SSO failure)
  const samlEvents = [
    {
      id: 'evt_saml_001',
      timestamp: new Date().toISOString(),
      service: 'sso',
      severity: 'error',
      message: 'SAML assertion validation failed: audience mismatch',
      correlation_key: 'saml-config-drift',
      tenant_id: 'tenant_acme'
    },
    {
      id: 'evt_saml_002',
      timestamp: new Date().toISOString(),
      service: 'sso',
      severity: 'error',
      message: 'SAML attribute mapping error: okta.userName not found',
      correlation_key: 'saml-config-drift',
      tenant_id: 'tenant_acme'
    },
    {
      id: 'evt_saml_003',
      timestamp: new Date().toISOString(),
      service: 'auth',
      severity: 'critical',
      message: 'SSO authentication failed: SAML signature invalid',
      correlation_key: 'saml-config-drift',
      tenant_id: 'tenant_acme'
    },
    {
      id: 'evt_saml_004',
      timestamp: new Date().toISOString(),
      service: 'sso',
      severity: 'error',
      message: 'SAML assertion expired: assertion issued at 2026-04-16T19:00:00Z',
      correlation_key: 'saml-config-drift',
      tenant_id: 'tenant_globex'
    },
    {
      id: 'evt_saml_005',
      timestamp: new Date().toISOString(),
      service: 'auth',
      severity: 'error',
      message: 'Okta SSO login failed: SAML response rejected',
      correlation_key: 'saml-config-drift',
      tenant_id: 'tenant_initech'
    },
    {
      id: 'evt_saml_006',
      timestamp: new Date().toISOString(),
      service: 'sso',
      severity: 'warning',
      message: 'SAML metadata refresh needed: Okta IdP certificate expiring',
      correlation_key: 'saml-config-drift',
      tenant_id: 'tenant_acme'
    }
  ];

  // Log events to store
  for (const event of samlEvents) {
    store.logEvent(event);
  }

  // Create bucket for promotion
  const bucket = {
    key: 'saml-config-drift',
    events: samlEvents,
    services: new Set(['sso', 'auth']),
    severities: new Set(['error', 'critical', 'warning']),
    tenant_ids: new Set(['tenant_acme', 'tenant_globex', 'tenant_initech'])
  };

  // Promote to incident
  const incident = promoteIncident(bucket);

  // Verify SAML incident metadata
  console.log('\n=== SAML Incident Promotion Verification ===\n');
  console.log('Incident ID:', incident.id);
  console.log('Scenario ID:', incident.scenario_id);
  console.log('Protocol:', incident.protocol);
  console.log('Vendor Flavor:', incident.vendor_flavor);
  console.log('Compliance Impact:', incident.compliance_impact);
  console.log('Title:', incident.title);

  // Assertions
  let passed = 0;
  let failed = 0;

  try {
    assert.strictEqual(incident.scenario_id, 'saml-config-drift', 'Scenario should be saml-config-drift');
    console.log('✓ scenario_id is saml-config-drift');
    passed++;
  } catch (err) {
    console.log('✗ scenario_id check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(incident.protocol, 'SAML', 'Protocol should be SAML');
    console.log('✓ protocol is SAML');
    passed++;
  } catch (err) {
    console.log('✗ protocol check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(incident.vendor_flavor, 'okta-style', 'Vendor flavor should be okta-style');
    console.log('✓ vendor_flavor is okta-style');
    passed++;
  } catch (err) {
    console.log('✗ vendor_flavor check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(incident.compliance_impact, 'AUTH_CONFIG_DRIFT', 'Compliance impact should be AUTH_CONFIG_DRIFT');
    console.log('✓ compliance_impact is AUTH_CONFIG_DRIFT');
    passed++;
  } catch (err) {
    console.log('✗ compliance_impact check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(incident.title.includes('SAML'), 'Title should mention SAML');
    console.log('✓ title mentions SAML');
    passed++;
  } catch (err) {
    console.log('✗ title check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(incident.title.includes('Okta-style'), 'Title should mention Okta-style');
    console.log('✓ title mentions Okta-style');
    passed++;
  } catch (err) {
    console.log('✗ title Okta-style check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(incident.runbook_ref, 'runbooks/saml-config-drift.md', 'Runbook should be saml-config-drift.md');
    console.log('✓ runbook_ref is runbooks/saml-config-drift.md');
    passed++;
  } catch (err) {
    console.log('✗ runbook_ref check failed:', err.message);
    failed++;
  }

  console.log(`\n${passed} checks passed, ${failed} checks failed\n`);

  return {
    success: failed === 0,
    incident,
    passed,
    failed
  };
}

/**
 * Creates a SCIM-like event bucket and promotes it to an incident.
 * Verifies that the incident has:
 * - protocol: "SCIM"
 * - vendor_flavor: "okta-style"
 * - compliance_impact: "PROVISIONING_DRIFT"
 * - scenario_id: "scim-provisioning-drift"
 */
function testSCIMIncidentPromotion() {
  // Reset runtime to clean state
  store.resetRuntime();

  // Create SCIM-like events (Okta-style provisioning failure)
  const scimEvents = [
    {
      id: 'evt_scim_001',
      timestamp: new Date().toISOString(),
      service: 'provisioning',
      severity: 'error',
      message: 'SCIM user provisioning failed: userName mapping error',
      correlation_key: 'scim-provisioning-drift',
      tenant_id: 'tenant_acme'
    },
    {
      id: 'evt_scim_002',
      timestamp: new Date().toISOString(),
      service: 'provisioning',
      severity: 'error',
      message: 'Okta group sync failed: Okta-Admins group not found',
      correlation_key: 'scim-provisioning-drift',
      tenant_id: 'tenant_acme'
    },
    {
      id: 'evt_scim_003',
      timestamp: new Date().toISOString(),
      service: 'provisioning',
      severity: 'critical',
      message: 'SCIM deprovisioning error: user still active after deprovision request',
      correlation_key: 'scim-provisioning-drift',
      tenant_id: 'tenant_globex'
    },
    {
      id: 'evt_scim_004',
      timestamp: new Date().toISOString(),
      service: 'auth',
      severity: 'error',
      message: 'Role sync mismatch: Okta role mapping inconsistent',
      correlation_key: 'scim-provisioning-drift',
      tenant_id: 'tenant_initech'
    },
    {
      id: 'evt_scim_005',
      timestamp: new Date().toISOString(),
      service: 'provisioning',
      severity: 'warning',
      message: 'User sync backlog: 150 pending SCIM operations',
      correlation_key: 'scim-provisioning-drift',
      tenant_id: 'tenant_acme'
    },
    {
      id: 'evt_scim_006',
      timestamp: new Date().toISOString(),
      service: 'provisioning',
      severity: 'error',
      message: 'Provisioning drift detected: Okta-Users group membership mismatch',
      correlation_key: 'scim-provisioning-drift',
      tenant_id: 'tenant_globex'
    }
  ];

  // Log events to store
  for (const event of scimEvents) {
    store.logEvent(event);
  }

  // Create bucket for promotion
  const bucket = {
    key: 'scim-provisioning-drift',
    events: scimEvents,
    services: new Set(['provisioning', 'auth']),
    severities: new Set(['error', 'critical', 'warning']),
    tenant_ids: new Set(['tenant_acme', 'tenant_globex', 'tenant_initech'])
  };

  // Promote to incident
  const incident = promoteIncident(bucket);

  // Verify SCIM incident metadata
  console.log('\n=== SCIM Incident Promotion Verification ===\n');
  console.log('Incident ID:', incident.id);
  console.log('Scenario ID:', incident.scenario_id);
  console.log('Protocol:', incident.protocol);
  console.log('Vendor Flavor:', incident.vendor_flavor);
  console.log('Compliance Impact:', incident.compliance_impact);
  console.log('Title:', incident.title);

  // Assertions
  let passed = 0;
  let failed = 0;

  try {
    assert.strictEqual(incident.scenario_id, 'scim-provisioning-drift', 'Scenario should be scim-provisioning-drift');
    console.log('✓ scenario_id is scim-provisioning-drift');
    passed++;
  } catch (err) {
    console.log('✗ scenario_id check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(incident.protocol, 'SCIM', 'Protocol should be SCIM');
    console.log('✓ protocol is SCIM');
    passed++;
  } catch (err) {
    console.log('✗ protocol check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(incident.vendor_flavor, 'okta-style', 'Vendor flavor should be okta-style');
    console.log('✓ vendor_flavor is okta-style');
    passed++;
  } catch (err) {
    console.log('✗ vendor_flavor check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(incident.compliance_impact, 'PROVISIONING_DRIFT', 'Compliance impact should be PROVISIONING_DRIFT');
    console.log('✓ compliance_impact is PROVISIONING_DRIFT');
    passed++;
  } catch (err) {
    console.log('✗ compliance_impact check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(incident.title.includes('SCIM'), 'Title should mention SCIM');
    console.log('✓ title mentions SCIM');
    passed++;
  } catch (err) {
    console.log('✗ title check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(incident.title.includes('Okta-style'), 'Title should mention Okta-style');
    console.log('✓ title mentions Okta-style');
    passed++;
  } catch (err) {
    console.log('✗ title Okta-style check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(incident.runbook_ref, 'runbooks/scim-provisioning-drift.md', 'Runbook should be scim-provisioning-drift.md');
    console.log('✓ runbook_ref is runbooks/scim-provisioning-drift.md');
    passed++;
  } catch (err) {
    console.log('✗ runbook_ref check failed:', err.message);
    failed++;
  }

  console.log(`\n${passed} checks passed, ${failed} checks failed\n`);

  return {
    success: failed === 0,
    incident,
    passed,
    failed
  };
}

/**
 * Verifies that existing JWKS incidents remain unchanged.
 * Ensures JWKS incidents have:
 * - protocol: "JWKS"
 * - vendor_flavor: null (not okta-style)
 * - Existing compliance labels unchanged
 */
function testJWKSIncidentUnchanged() {
  // Reset runtime to clean state
  store.resetRuntime();

  // Create JWKS-like events (existing scenario)
  const jwksEvents = [
    {
      id: 'evt_jwks_001',
      timestamp: new Date().toISOString(),
      service: 'auth',
      severity: 'critical',
      message: 'JWT signature validation failed: kid=key_2026_002 not in cache',
      correlation_key: 'jwks-rotation',
      tenant_id: 'tenant_acme'
    },
    {
      id: 'evt_jwks_002',
      timestamp: new Date().toISOString(),
      service: 'auth',
      severity: 'error',
      message: 'JWKS cache stale: key rotation detected',
      correlation_key: 'jwks-rotation',
      tenant_id: 'tenant_globex'
    },
    {
      id: 'evt_jwks_003',
      timestamp: new Date().toISOString(),
      service: 'jwks-server',
      severity: 'error',
      message: 'Key rotation initiated: key_2026_001 -> key_2026_002',
      correlation_key: 'jwks-rotation',
      tenant_id: 'tenant_acme'
    },
    {
      id: 'evt_jwks_004',
      timestamp: new Date().toISOString(),
      service: 'auth',
      severity: 'error',
      message: 'Auth failure rate spike: 85% of requests failing',
      correlation_key: 'jwks-rotation',
      tenant_id: 'tenant_initech'
    },
    {
      id: 'evt_jwks_005',
      timestamp: new Date().toISOString(),
      service: 'auth',
      severity: 'error',
      message: 'JWT validation error: signature mismatch',
      correlation_key: 'jwks-rotation',
      tenant_id: 'tenant_globex'
    },
    {
      id: 'evt_jwks_006',
      timestamp: new Date().toISOString(),
      service: 'jwks-server',
      severity: 'warning',
      message: 'JWKS endpoint slow response: 2.5s latency',
      correlation_key: 'jwks-rotation',
      tenant_id: 'tenant_acme'
    }
  ];

  // Log events to store
  for (const event of jwksEvents) {
    store.logEvent(event);
  }

  // Create bucket for promotion
  const bucket = {
    key: 'jwks-rotation',
    events: jwksEvents,
    services: new Set(['auth', 'jwks-server']),
    severities: new Set(['critical', 'error', 'warning']),
    tenant_ids: new Set(['tenant_acme', 'tenant_globex', 'tenant_initech'])
  };

  // Promote to incident
  const incident = promoteIncident(bucket);

  // Verify JWKS incident metadata unchanged
  console.log('\n=== JWKS Incident Unchanged Verification ===\n');
  console.log('Incident ID:', incident.id);
  console.log('Scenario ID:', incident.scenario_id);
  console.log('Protocol:', incident.protocol);
  console.log('Vendor Flavor:', incident.vendor_flavor);
  console.log('Compliance Impact:', incident.compliance_impact);
  console.log('Title:', incident.title);

  // Assertions
  let passed = 0;
  let failed = 0;

  try {
    assert.strictEqual(incident.scenario_id, 'jwks-rotation-failure', 'Scenario should be jwks-rotation-failure');
    console.log('✓ scenario_id is jwks-rotation-failure');
    passed++;
  } catch (err) {
    console.log('✗ scenario_id check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(incident.protocol, 'JWKS', 'Protocol should be JWKS');
    console.log('✓ protocol is JWKS');
    passed++;
  } catch (err) {
    console.log('✗ protocol check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(incident.vendor_flavor, null, 'Vendor flavor should be null for JWKS');
    console.log('✓ vendor_flavor is null');
    passed++;
  } catch (err) {
    console.log('✗ vendor_flavor check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(incident.compliance_impact, 'AUTH_OUTAGE', 'Compliance impact should be AUTH_OUTAGE');
    console.log('✓ compliance_impact is AUTH_OUTAGE');
    passed++;
  } catch (err) {
    console.log('✗ compliance_impact check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(incident.title.includes('JWKS'), 'Title should mention JWKS');
    console.log('✓ title mentions JWKS');
    passed++;
  } catch (err) {
    console.log('✗ title check failed:', err.message);
    failed++;
  }

  console.log(`\n${passed} checks passed, ${failed} checks failed\n`);

  return {
    success: failed === 0,
    incident,
    passed,
    failed
  };
}

// Run all tests if called directly
if (require.main === module) {
  console.log('\n========================================');
  console.log('SAML/SCIM Incident Promotion Fixture Tests');
  console.log('========================================\n');

  const samlResult = testSAMLIncidentPromotion();
  const scimResult = testSCIMIncidentPromotion();
  const jwksResult = testJWKSIncidentUnchanged();

  console.log('\n========================================');
  console.log('Summary');
  console.log('========================================');
  console.log(`SAML Test: ${samlResult.success ? 'PASSED' : 'FAILED'}`);
  console.log(`SCIM Test: ${scimResult.success ? 'PASSED' : 'FAILED'}`);
  console.log(`JWKS Test: ${jwksResult.success ? 'PASSED' : 'FAILED'}`);

  const allPassed = samlResult.success && scimResult.success && jwksResult.success;
  console.log(`\nOverall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  if (!allPassed) {
    process.exit(1);
  }
}

module.exports = {
  testSAMLIncidentPromotion,
  testSCIMIncidentPromotion,
  testJWKSIncidentUnchanged
};
