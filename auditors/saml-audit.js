// auditors/saml-audit.js
// SAML configuration health auditor

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const store = require('../runtime/store');

const AUDIT_DIR = path.join(__dirname, '..', 'artifacts', 'audits');

function runSAMLAudit() {
  console.log(chalk.blue('Running SAML configuration audit...\n'));

  const samlState = store.getSAMLState();
  const checks = [];

  // Check 1: Metadata freshness (within 30 days)
  const metadataAge = (Date.now() - new Date(samlState.last_metadata_refresh).getTime()) / (1000 * 60 * 60 * 24);
  checks.push({
    name: 'metadata_freshness',
    status: metadataAge < 30 ? 'passed' : 'failed',
    detail: metadataAge < 30
      ? `Metadata refreshed ${Math.floor(metadataAge)} days ago`
      : `Metadata stale: ${Math.floor(metadataAge)} days old (threshold: 30 days)`
  });

  // Check 2: Signature trust/certificate validity
  checks.push({
    name: 'signature_trust_valid',
    status: samlState.signature_valid ? 'passed' : 'failed',
    detail: samlState.signature_valid
      ? 'Signature validation passing'
      : 'Signature validation failing - certificate may be expired or misconfigured'
  });

  // Check 3: Audience validation
  checks.push({
    name: 'audience_validation',
    status: samlState.assertion_audience_status === 'valid' ? 'passed' : 'failed',
    detail: samlState.assertion_audience_status === 'valid'
      ? 'Audience validation passing'
      : `Audience validation failing: ${samlState.assertion_audience_status}`
  });

  // Check 4: Attribute mapping completeness
  checks.push({
    name: 'attribute_mapping_complete',
    status: samlState.attribute_mapping_complete ? 'passed' : 'failed',
    detail: samlState.attribute_mapping_complete
      ? 'All required attributes mapped correctly'
      : `Attribute mapping incomplete: ${samlState.mapping_failures.length} failures detected`
  });

  // Generate report
  const report = {
    audit_type: 'saml',
    audited_at: new Date().toISOString(),
    vendor_flavor: samlState.vendor_flavor,
    checks,
    summary: {
      passed: checks.filter(c => c.status === 'passed').length,
      failed: checks.filter(c => c.status === 'failed').length,
      total: checks.length
    },
    saml_state: {
      last_metadata_refresh: samlState.last_metadata_refresh,
      assertion_audience_status: samlState.assertion_audience_status,
      signature_valid: samlState.signature_valid,
      attribute_mapping_complete: samlState.attribute_mapping_complete,
      mapping_failures: samlState.mapping_failures
    }
  };

  // Save report
  if (!fs.existsSync(AUDIT_DIR)) {
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
  }

  const reportPath = path.join(AUDIT_DIR, `saml-audit-${new Date().toISOString().split('T')[0]}.json`);
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
  runSAMLAudit();
}

module.exports = { runSAMLAudit };
