// auditors/scim-audit.js
// SCIM provisioning drift auditor

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const store = require('../runtime/store');

const AUDIT_DIR = path.join(__dirname, '..', 'artifacts', 'audits');

function runSCIMAudit() {
  console.log(chalk.blue('Running SCIM provisioning audit...\n'));

  const scimState = store.getSCIMState();
  const checks = [];

  // Check 1: Provisioning status
  checks.push({
    name: 'provisioning_status_healthy',
    status: scimState.provision_status === 'healthy' ? 'passed' : 'failed',
    detail: scimState.provision_status === 'healthy' ?
      'Provisioning status is healthy' :
      `Provisioning status: ${scimState.provision_status}`
  });

  // Check 2: Deprovision handling
  checks.push({
    name: 'deprovision_handling_healthy',
    status: scimState.deprovision_status === 'healthy' ? 'passed' : 'failed',
    detail: scimState.deprovision_status === 'healthy' ?
      'Deprovision handling is healthy' :
      `Deprovision status: ${scimState.deprovision_status}`
  });

  // Check 3: Group sync drift
  const groupSyncDrift = scimState.provisioning_drift.filter(d => {
    const expected = d.expected_groups || [];
    const actual = d.actual_groups || [];
    return JSON.stringify(expected.sort()) !== JSON.stringify(actual.sort());
  });
  checks.push({
    name: 'group_sync_no_drift',
    status: scimState.group_sync_status === 'healthy' && groupSyncDrift.length === 0 ? 'passed' : 'failed',
    detail: scimState.group_sync_status === 'healthy' && groupSyncDrift.length === 0 ?
      'Group sync is healthy with no drift' :
      `Group sync status: ${scimState.group_sync_status}, drift detected for ${groupSyncDrift.length} user(s)`
  });

  // Check 4: Role sync drift
  checks.push({
    name: 'role_sync_no_drift',
    status: scimState.role_sync_status === 'healthy' ? 'passed' : 'failed',
    detail: scimState.role_sync_status === 'healthy' ?
      'Role sync is healthy' :
      `Role sync status: ${scimState.role_sync_status}`
  });

  // Generate report
  const report = {
    audit_type: 'scim',
    audited_at: new Date().toISOString(),
    vendor_flavor: scimState.vendor_flavor,
    checks,
    summary: {
      passed: checks.filter(c => c.status === 'passed').length,
      failed: checks.filter(c => c.status === 'failed').length,
      total: checks.length
    },
    provision_status: scimState.provision_status,
    deprovision_status: scimState.deprovision_status,
    group_sync_status: scimState.group_sync_status,
    role_sync_status: scimState.role_sync_status,
    provisioning_drift_count: scimState.provisioning_drift.length,
    last_sync_errors_count: scimState.last_sync_errors.length
  };

  // Save report
  if (!fs.existsSync(AUDIT_DIR)) {
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
  }

  const reportPath = path.join(AUDIT_DIR, `scim-audit-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print results
  checks.forEach(check => {
    const icon = check.status === 'passed' ? chalk.green('✓') : chalk.red('✗');
    const name = check.status === 'passed' ? chalk.green(check.name) : chalk.red(check.name);
    console.log(`${icon} ${name}: ${check.detail}`);
  });

  console.log(`\n${chalk.bold('Summary:')} ${report.summary.passed} passed, ${report.summary.failed} failed`);
  console.log(`Report saved to: ${reportPath}\n`);

  // Exit with error if any checks failed
  if (report.summary.failed > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSCIMAudit();
}

module.exports = { runSCIMAudit };
