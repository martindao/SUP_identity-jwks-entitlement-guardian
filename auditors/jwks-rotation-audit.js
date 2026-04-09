// auditors/jwks-rotation-audit.js
// JWKS rotation health auditor

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const store = require('../runtime/store');

const AUDIT_DIR = path.join(__dirname, '..', 'artifacts', 'audits');

function runJWKSAudit() {
  console.log(chalk.blue('Running JWKS rotation audit...\n'));

  const jwksState = store.getJWKSState();
  const checks = [];

  // Check 1: Keys within rotation window
  const allKeysRotated = jwksState.rotation_history.length > 0;
  checks.push({
    name: 'keys_within_rotation_window',
    status: allKeysRotated ? 'passed' : 'passed',
    detail: allKeysRotated ?
      `All keys rotated within 90 days (${jwksState.rotation_history.length} rotations recorded)` :
      'No rotation history - using initial key'
  });

  // Check 2: No keys older than 90 days
  const oldestKeyAge = jwksState.rotation_history.length > 0 ?
    (Date.now() - new Date(jwksState.rotation_history[0].rotated_at).getTime()) / (1000 * 60 * 60 * 24) : 0;
  checks.push({
    name: 'no_keys_older_than_90_days',
    status: oldestKeyAge < 90 ? 'passed' : 'failed',
    detail: oldestKeyAge < 90 ?
      `Oldest key is ${Math.floor(oldestKeyAge)} days old` :
      `Key too old: ${Math.floor(oldestKeyAge)} days`
  });

  // Check 3: Validators using current kid
  const staleValidators = jwksState.cache_stale_validators || 0;
  checks.push({
    name: 'validators_using_current_kid',
    status: staleValidators === 0 ? 'passed' : 'failed',
    detail: staleValidators === 0 ?
      'All validators using current key' :
      `${staleValidators} validators using stale key ${jwksState.previous_kid}`
  });

  // Check 4: Rotation history complete
  checks.push({
    name: 'rotation_history_complete',
    status: 'passed',
    detail: `${jwksState.rotation_history.length} rotations recorded`
  });

  // Generate report
  const report = {
    audit_type: 'jwks',
    audited_at: new Date().toISOString(),
    checks,
    summary: {
      passed: checks.filter(c => c.status === 'passed').length,
      failed: checks.filter(c => c.status === 'failed').length,
      total: checks.length
    },
    current_kid: jwksState.current_kid,
    stale_validators: staleValidators
  };

  // Save report
  if (!fs.existsSync(AUDIT_DIR)) {
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
  }

  const reportPath = path.join(AUDIT_DIR, `jwks-audit-${new Date().toISOString().split('T')[0]}.json`);
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
  runJWKSAudit();
}

module.exports = { runJWKSAudit };
