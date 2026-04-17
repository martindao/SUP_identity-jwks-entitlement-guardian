// tests/fixtures/evidence-bundle-fixture.js
// Node fixture for evidence bundle verification
// Verifies that evidence bundles include saml_state, scim_state, vendor_flavor, and checksum

const assert = require('assert');
const store = require('../../runtime/store');
const { captureEvidence } = require('../../intelligence-core/evidence/snapshot');

/**
 * Creates a SAML incident and captures evidence.
 * Verifies that the evidence bundle has:
 * - saml_state block with vendor_flavor: "okta-style"
 * - scim_state block (present but healthy)
 * - vendor_flavor: "okta-style"
 * - checksum covering enterprise identity fields
 */
function testSAMLEvidenceCapture() {
  // Reset runtime to clean state
  store.resetRuntime();

  // Set up SAML state with failures
  store.setSAMLState({
    vendor_flavor: 'okta-style',
    last_assertion_review: new Date().toISOString(),
    assertion_audience_status: 'invalid',
    signature_valid: false,
    attribute_mapping_complete: false,
    mapping_failures: [
      { attribute: 'okta.userName', error: 'not found in assertion' },
      { attribute: 'okta.groups', error: 'empty value' }
    ],
    last_metadata_refresh: new Date().toISOString()
  });

  // Create mock incident
  const incident = {
    id: 'inc_saml_001',
    scenario_id: 'saml-config-drift',
    affected_tenants: ['tenant_acme', 'tenant_globex'],
    compliance_impact: 'AUTH_CONFIG_DRIFT',
    vendor_flavor: 'okta-style',
    correlated_events: ['evt_saml_001', 'evt_saml_002']
  };

  // Capture evidence
  const evidence = captureEvidence(incident);

  // Verify evidence structure
  console.log('\n=== SAML Evidence Bundle Verification ===\n');
  console.log('Incident ID:', evidence.incident_id);
  console.log('Scenario ID:', evidence.scenario_id);
  console.log('Vendor Flavor:', evidence.vendor_flavor);
  console.log('Checksum:', evidence.checksum);

  // Assertions
  let passed = 0;
  let failed = 0;

  try {
    assert.ok(evidence.saml_state, 'Evidence should have saml_state block');
    console.log('✓ saml_state block present');
    passed++;
  } catch (err) {
    console.log('✗ saml_state block missing:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(evidence.saml_state.vendor_flavor, 'okta-style', 'SAML vendor_flavor should be okta-style');
    console.log('✓ saml_state.vendor_flavor is okta-style');
    passed++;
  } catch (err) {
    console.log('✗ saml_state.vendor_flavor check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(evidence.saml_state.assertion_audience_status, 'invalid', 'Audience status should be invalid');
    console.log('✓ saml_state.assertion_audience_status is invalid');
    passed++;
  } catch (err) {
    console.log('✗ assertion_audience_status check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(evidence.saml_state.signature_valid, false, 'Signature should be invalid');
    console.log('✓ saml_state.signature_valid is false');
    passed++;
  } catch (err) {
    console.log('✗ signature_valid check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(Array.isArray(evidence.saml_state.mapping_failures), 'mapping_failures should be an array');
    console.log('✓ saml_state.mapping_failures is array');
    passed++;
  } catch (err) {
    console.log('✗ mapping_failures check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(evidence.saml_state.mapping_failures.length, 2, 'Should have 2 mapping failures');
    console.log('✓ saml_state.mapping_failures has 2 entries');
    passed++;
  } catch (err) {
    console.log('✗ mapping_failures count check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(evidence.scim_state, 'Evidence should have scim_state block');
    console.log('✓ scim_state block present');
    passed++;
  } catch (err) {
    console.log('✗ scim_state block missing:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(evidence.vendor_flavor, 'okta-style', 'Evidence vendor_flavor should be okta-style');
    console.log('✓ vendor_flavor is okta-style');
    passed++;
  } catch (err) {
    console.log('✗ vendor_flavor check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(evidence.checksum, 'Evidence should have checksum');
    console.log('✓ checksum present');
    passed++;
  } catch (err) {
    console.log('✗ checksum check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(evidence.checksum.startsWith('sha256:'), 'Checksum should start with sha256:');
    console.log('✓ checksum format is sha256:...');
    passed++;
  } catch (err) {
    console.log('✗ checksum format check failed:', err.message);
    failed++;
  }

  console.log(`\n${passed} checks passed, ${failed} checks failed\n`);

  return {
    success: failed === 0,
    evidence,
    passed,
    failed
  };
}

/**
 * Creates a SCIM incident and captures evidence.
 * Verifies that the evidence bundle has:
 * - scim_state block with provisioning drift details
 * - saml_state block (present but healthy)
 * - vendor_flavor: "okta-style"
 * - checksum covering enterprise identity fields
 */
function testSCIMEvidenceCapture() {
  // Reset runtime to clean state
  store.resetRuntime();

  // Set up SCIM state with drift
  store.setSCIMState({
    vendor_flavor: 'okta-style',
    last_provisioning_sync: new Date().toISOString(),
    provision_status: 'degraded',
    deprovision_status: 'healthy',
    group_sync_status: 'failed',
    role_sync_status: 'degraded',
    provisioning_drift: [
      { user: 'john.doe@example.com', expected_groups: ['Okta-Users', 'Okta-Admins'], actual_groups: ['Okta-Users'] },
      { user: 'jane.smith@example.com', expected_groups: ['Okta-Users'], actual_groups: [] }
    ],
    last_sync_errors: [
      { timestamp: new Date().toISOString(), error: 'Group Okta-Admins not found in target' }
    ]
  });

  // Create mock incident
  const incident = {
    id: 'inc_scim_001',
    scenario_id: 'scim-provisioning-drift',
    affected_tenants: ['tenant_acme', 'tenant_globex', 'tenant_initech'],
    compliance_impact: 'PROVISIONING_DRIFT',
    vendor_flavor: 'okta-style',
    correlated_events: ['evt_scim_001', 'evt_scim_002']
  };

  // Capture evidence
  const evidence = captureEvidence(incident);

  // Verify evidence structure
  console.log('\n=== SCIM Evidence Bundle Verification ===\n');
  console.log('Incident ID:', evidence.incident_id);
  console.log('Scenario ID:', evidence.scenario_id);
  console.log('Vendor Flavor:', evidence.vendor_flavor);
  console.log('Checksum:', evidence.checksum);

  // Assertions
  let passed = 0;
  let failed = 0;

  try {
    assert.ok(evidence.scim_state, 'Evidence should have scim_state block');
    console.log('✓ scim_state block present');
    passed++;
  } catch (err) {
    console.log('✗ scim_state block missing:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(evidence.scim_state.vendor_flavor, 'okta-style', 'SCIM vendor_flavor should be okta-style');
    console.log('✓ scim_state.vendor_flavor is okta-style');
    passed++;
  } catch (err) {
    console.log('✗ scim_state.vendor_flavor check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(evidence.scim_state.provision_status, 'degraded', 'Provision status should be degraded');
    console.log('✓ scim_state.provision_status is degraded');
    passed++;
  } catch (err) {
    console.log('✗ provision_status check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(evidence.scim_state.group_sync_status, 'failed', 'Group sync status should be failed');
    console.log('✓ scim_state.group_sync_status is failed');
    passed++;
  } catch (err) {
    console.log('✗ group_sync_status check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(Array.isArray(evidence.scim_state.provisioning_drift), 'provisioning_drift should be an array');
    console.log('✓ scim_state.provisioning_drift is array');
    passed++;
  } catch (err) {
    console.log('✗ provisioning_drift check failed:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(evidence.scim_state.provisioning_drift.length, 2, 'Should have 2 provisioning drift entries');
    console.log('✓ scim_state.provisioning_drift has 2 entries');
    passed++;
  } catch (err) {
    console.log('✗ provisioning_drift count check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(Array.isArray(evidence.scim_state.last_sync_errors), 'last_sync_errors should be an array');
    console.log('✓ scim_state.last_sync_errors is array');
    passed++;
  } catch (err) {
    console.log('✗ last_sync_errors check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(evidence.saml_state, 'Evidence should have saml_state block');
    console.log('✓ saml_state block present');
    passed++;
  } catch (err) {
    console.log('✗ saml_state block missing:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(evidence.vendor_flavor, 'okta-style', 'Evidence vendor_flavor should be okta-style');
    console.log('✓ vendor_flavor is okta-style');
    passed++;
  } catch (err) {
    console.log('✗ vendor_flavor check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(evidence.checksum, 'Evidence should have checksum');
    console.log('✓ checksum present');
    passed++;
  } catch (err) {
    console.log('✗ checksum check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(evidence.checksum.startsWith('sha256:'), 'Checksum should start with sha256:');
    console.log('✓ checksum format is sha256:...');
    passed++;
  } catch (err) {
    console.log('✗ checksum format check failed:', err.message);
    failed++;
  }

  console.log(`\n${passed} checks passed, ${failed} checks failed\n`);

  return {
    success: failed === 0,
    evidence,
    passed,
    failed
  };
}

/**
 * Verifies that JWKS evidence capture still works (unchanged).
 * Ensures JWKS incidents have saml_state and scim_state blocks
 * but with vendor_flavor: null.
 */
function testJWKSEvidenceUnchanged() {
  // Reset runtime to clean state
  store.resetRuntime();

  // Create mock incident
  const incident = {
    id: 'inc_jwks_001',
    scenario_id: 'jwks-rotation-failure',
    affected_tenants: ['tenant_acme', 'tenant_globex'],
    compliance_impact: 'AUTH_OUTAGE',
    vendor_flavor: null,
    correlated_events: ['evt_jwks_001', 'evt_jwks_002']
  };

  // Capture evidence
  const evidence = captureEvidence(incident);

  // Verify evidence structure
  console.log('\n=== JWKS Evidence Bundle Verification ===\n');
  console.log('Incident ID:', evidence.incident_id);
  console.log('Scenario ID:', evidence.scenario_id);
  console.log('Vendor Flavor:', evidence.vendor_flavor);
  console.log('Checksum:', evidence.checksum);

  // Assertions
  let passed = 0;
  let failed = 0;

  try {
    assert.ok(evidence.jwks_state, 'Evidence should have jwks_state block');
    console.log('✓ jwks_state block present');
    passed++;
  } catch (err) {
    console.log('✗ jwks_state block missing:', err.message);
    failed++;
  }

  try {
    assert.ok(evidence.saml_state, 'Evidence should have saml_state block');
    console.log('✓ saml_state block present');
    passed++;
  } catch (err) {
    console.log('✗ saml_state block missing:', err.message);
    failed++;
  }

  try {
    assert.ok(evidence.scim_state, 'Evidence should have scim_state block');
    console.log('✓ scim_state block present');
    passed++;
  } catch (err) {
    console.log('✗ scim_state block missing:', err.message);
    failed++;
  }

  try {
    assert.strictEqual(evidence.vendor_flavor, null, 'JWKS evidence vendor_flavor should be null');
    console.log('✓ vendor_flavor is null');
    passed++;
  } catch (err) {
    console.log('✗ vendor_flavor check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(evidence.checksum, 'Evidence should have checksum');
    console.log('✓ checksum present');
    passed++;
  } catch (err) {
    console.log('✗ checksum check failed:', err.message);
    failed++;
  }

  try {
    assert.ok(evidence.checksum.startsWith('sha256:'), 'Checksum should start with sha256:');
    console.log('✓ checksum format is sha256:...');
    passed++;
  } catch (err) {
    console.log('✗ checksum format check failed:', err.message);
    failed++;
  }

  console.log(`\n${passed} checks passed, ${failed} checks failed\n`);

  return {
    success: failed === 0,
    evidence,
    passed,
    failed
  };
}

// Run all tests if called directly
if (require.main === module) {
  console.log('\n========================================');
  console.log('Evidence Bundle Fixture Tests');
  console.log('========================================\n');

  const samlResult = testSAMLEvidenceCapture();
  const scimResult = testSCIMEvidenceCapture();
  const jwksResult = testJWKSEvidenceUnchanged();

  console.log('\n========================================');
  console.log('Summary');
  console.log('========================================');
  console.log(`SAML Evidence Test: ${samlResult.success ? 'PASSED' : 'FAILED'}`);
  console.log(`SCIM Evidence Test: ${scimResult.success ? 'PASSED' : 'FAILED'}`);
  console.log(`JWKS Evidence Test: ${jwksResult.success ? 'PASSED' : 'FAILED'}`);

  const allPassed = samlResult.success && scimResult.success && jwksResult.success;
  console.log(`\nOverall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  if (!allPassed) {
    process.exit(1);
  }
}

module.exports = {
  testSAMLEvidenceCapture,
  testSCIMEvidenceCapture,
  testJWKSEvidenceUnchanged
};
