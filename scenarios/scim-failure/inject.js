// scenarios/scim-failure/inject.js
// Simulates SCIM provisioning/deprovisioning/group sync failure

const store = require('../../runtime/store');

function injectSCIMFailure() {
  console.log('Injecting SCIM provisioning drift scenario...');

  // Set scenario mode
  store.setScenarioMode('scim-provisioning-drift');

  // Get current SCIM state
  const scimState = store.getSCIMState();

  // Update SCIM state with failure indicators
  scimState.provision_status = 'failed';
  scimState.deprovision_status = 'degraded';
  scimState.group_sync_status = 'mismatch';
  scimState.role_sync_status = 'mismatch';

  // Add provisioning drift entries
  scimState.provisioning_drift = [
    {
      user: 'jsmith@example.com',
      expected_groups: ['Okta-Admins', 'Okta-Users'],
      actual_groups: ['Okta-Users'],
      drift_type: 'missing_group'
    },
    {
      user: 'mjones@example.com',
      expected_groups: ['Okta-Users', 'Okta-Sales'],
      actual_groups: ['Okta-Users', 'Okta-Sales', 'Okta-Admins'],
      drift_type: 'extra_group'
    }
  ];

  // Add sync errors
  scimState.last_sync_errors = [
    {
      timestamp: new Date().toISOString(),
      error: 'Provision request failed: 401 Unauthorized - token expired',
      operation: 'POST /scim/v2/Users'
    },
    {
      timestamp: new Date().toISOString(),
      error: 'Deprovision action incomplete: user remains active',
      operation: 'PATCH /scim/v2/Users/{userId}'
    },
    {
      timestamp: new Date().toISOString(),
      error: 'Group sync mismatch: Okta-Admins not mapped',
      operation: 'Group assignment sync'
    }
  ];

  store.setSCIMState(scimState);

  // Log provision request failure
  store.logEvent({
    id: `evt_${Date.now()}_provision_fail`,
    timestamp: new Date().toISOString(),
    service: 'scim-provisioning',
    severity: 'critical',
    message: 'SCIM provision request failed: 401 Unauthorized - service account token expired',
    correlation_key: 'scim-provisioning-drift',
    user_email: 'newhire@example.com',
    error_code: 401,
    operation: 'POST /scim/v2/Users'
  });

  // Log deprovision state issue
  store.logEvent({
    id: `evt_${Date.now()}_deprovision_issue`,
    timestamp: new Date().toISOString(),
    service: 'scim-provisioning',
    severity: 'critical',
    message: 'SCIM deprovision action incomplete: terminated user still has active access',
    correlation_key: 'scim-provisioning-drift',
    user_email: 'terminated_user@example.com',
    expected_state: 'inactive',
    actual_state: 'active',
    operation: 'PATCH /scim/v2/Users/{userId}'
  });

  // Log group sync mismatch
  store.logEvent({
    id: `evt_${Date.now()}_group_mismatch`,
    timestamp: new Date().toISOString(),
    service: 'scim-provisioning',
    severity: 'error',
    message: 'SCIM group sync mismatch: user missing Okta-Admins group membership',
    correlation_key: 'scim-provisioning-drift',
    user_email: 'jsmith@example.com',
    expected_groups: ['Okta-Admins', 'Okta-Users'],
    actual_groups: ['Okta-Users'],
    drift_type: 'missing_group'
  });

  // Log role sync mismatch
  store.logEvent({
    id: `evt_${Date.now()}_role_mismatch`,
    timestamp: new Date().toISOString(),
    service: 'scim-provisioning',
    severity: 'error',
    message: 'SCIM role sync mismatch: user has unauthorized Okta-Admins role',
    correlation_key: 'scim-provisioning-drift',
    user_email: 'mjones@example.com',
    expected_roles: ['User', 'Sales'],
    actual_roles: ['User', 'Sales', 'Admin'],
    drift_type: 'extra_role'
  });

  // Log sync failure summary
  store.logEvent({
    id: `evt_${Date.now()}_sync_summary`,
    timestamp: new Date().toISOString(),
    service: 'scim-provisioning',
    severity: 'critical',
    message: 'SCIM sync drift detected: 2 users with group/role mismatches, 1 provision failure, 1 deprovision incomplete',
    correlation_key: 'scim-provisioning-drift',
    affected_users: 4,
    provision_failures: 1,
    deprovision_issues: 1,
    group_mismatches: 2
  });

  // Update component health
  store.updateComponentHealth('scim-provisioning', 'degraded');

  console.log('SCIM provisioning drift scenario injected successfully');
  console.log('  Provision status: failed');
  console.log('  Deprovision status: degraded');
  console.log('  Group sync status: mismatch');
  console.log('  Role sync status: mismatch');
  console.log('  Affected users: 4');

  return {
    success: true,
    scenario: 'scim-provisioning-drift',
    details: {
      provision_status: 'failed',
      deprovision_status: 'degraded',
      group_sync_status: 'mismatch',
      role_sync_status: 'mismatch',
      affected_users: 4,
      drift_entries: scimState.provisioning_drift.length,
      sync_errors: scimState.last_sync_errors.length
    }
  };
}

// Run if called directly
if (require.main === module) {
  injectSCIMFailure();
}

module.exports = { injectSCIMFailure };
