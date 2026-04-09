// auditors/tenant-isolation-audit.js
// Tenant isolation health auditor

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const store = require('../runtime/store');

const AUDIT_DIR = path.join(__dirname, '..', 'artifacts', 'audits');

function runTenantAudit() {
  console.log(chalk.blue('Running tenant isolation audit...\n'));

  const tenantState = store.getTenantState();
  const checks = [];

  // Check 1: All queries filtered by tenant
  const violations = tenantState.cross_tenant_violations || [];
  checks.push({
    name: 'all_queries_filtered_by_tenant',
    status: violations.length === 0 ? 'passed' : 'failed',
    detail: violations.length === 0 ?
      'All queries include tenant_id filter' :
      `${violations.length} queries missing tenant filter detected`
  });

  // Check 2: No tenant boundaries violated
  checks.push({
    name: 'no_tenant_boundaries_violated',
    status: violations.length === 0 ? 'passed' : 'failed',
    detail: violations.length === 0 ?
      'No cross-tenant queries detected' :
      `${violations.length} cross-tenant queries detected`
  });

  // Check 3: No exposed service role keys
  const exposedKeys = tenantState.exposed_keys || [];
  checks.push({
    name: 'no_exposed_service_role_keys',
    status: exposedKeys.length === 0 ? 'passed' : 'failed',
    detail: exposedKeys.length === 0 ?
      'No service role keys exposed' :
      `${exposedKeys.length} service role keys exposed: ${exposedKeys.map(k => k.exposed_in).join(', ')}`
  });

  // Generate report
  const report = {
    audit_type: 'tenants',
    audited_at: new Date().toISOString(),
    checks,
    summary: {
      passed: checks.filter(c => c.status === 'passed').length,
      failed: checks.filter(c => c.status === 'failed').length,
      total: checks.length
    },
    cross_tenant_violations: violations.length,
    exposed_keys: exposedKeys.length
  };

  // Save report
  if (!fs.existsSync(AUDIT_DIR)) {
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
  }

  const reportPath = path.join(AUDIT_DIR, `tenant-audit-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print results
  checks.forEach(check => {
    const icon = check.status === 'passed' ? chalk.green('✓') : chalk.red('✗');
    const name = check.status === 'passed' ? chalk.green(check.name) : chalk.red(check.name);
    console.log(`${icon} ${name}: ${check.detail}`);
  });

  console.log(`\n${chalk.bold('Summary:')} ${report.summary.passed} passed, ${report.summary.failed} failed`);
  console.log(`Report saved to: ${reportPath}\n`);

  if (report.summary.failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTenantAudit();
}

module.exports = { runTenantAudit };
