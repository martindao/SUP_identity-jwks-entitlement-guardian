// intelligence-core/summaries/summary.js
// Generates markdown summary for incident

function generateSummary(incident, evidence, timeline) {
  const lines = [];
  
  // Title
  lines.push(`# Incident: ${incident.title}`);
  lines.push('');
  
  // Metadata table
  lines.push('## Metadata');
  lines.push('| Field | Value |');
  lines.push('|-------|-------|');
  lines.push(`| Incident ID | ${incident.id} |`);
  lines.push(`| Severity | ${incident.severity} |`);
  lines.push(`| Status | ${incident.status} |`);
  lines.push(`| Opened | ${incident.opened_at} |`);
  lines.push(`| Primary Service | ${incident.primary_service} |`);
  lines.push(`| Compliance Impact | ${incident.compliance_impact} |`);
  lines.push('');
  
  // What Happened
  lines.push('## What Happened');
  lines.push(generateWhatHappened(incident, evidence));
  lines.push('');
  
  // Evidence Captured
  lines.push('## Evidence Captured');
  const evidenceLines = generateEvidenceLines(incident, evidence);
  lines.push(...evidenceLines);
  lines.push('');
  
  // Timeline Highlights
  lines.push('## Timeline Highlights');
  const timelineLines = generateTimelineLines(timeline);
  lines.push(...timelineLines);
  lines.push('');
  
  // Recommended Next Actions
  lines.push('## Recommended Next Actions');
  const actionLines = generateActionLines(evidence.recommended_action);
  lines.push(...actionLines);
  lines.push('');
  
  // Runbook link
  lines.push(`**Runbook:** [${incident.runbook_ref}](../${incident.runbook_ref})`);
  
  return lines.join('\n');
}

function generateWhatHappened(incident, evidence) {
  const scenarios = {
    'jwks-rotation-failure': 
      `A signing key was rotated on the JWKS server. Validators with stale JWKS cache rejected new tokens, causing authentication failures across ${evidence.affected_tenants.length} tenants.`,
    
    'rls-bypass': 
      `A service role key was exposed in the frontend bundle. This bypassed RLS, allowing cross-tenant data access. ${evidence.cross_tenant_violations.length} cross-tenant queries were detected.`,
    
    'cross-tenant-exposure': 
      `A query missing tenant_id filter returned data across tenant boundaries. ${evidence.affected_tenants.length} tenants were affected by this data exposure.`
  };
  
  return scenarios[incident.scenario_id] || 
    `Multiple failures were detected across ${incident.affected_components.join(', ')}. Affected ${evidence.affected_tenants.length} tenants.`;
}

function generateEvidenceLines(incident, evidence) {
  const lines = [];
  
  if (incident.scenario_id === 'jwks-rotation-failure') {
    lines.push(`- Current key ID: ${evidence.jwks_state.current_kid}`);
    lines.push(`- Previous key ID: ${evidence.jwks_state.previous_kid || 'N/A'}`);
    lines.push(`- Validators with stale cache: ${evidence.jwks_state.validators_with_stale_cache}`);
    lines.push(`- Auth failure rate: ${evidence.auth_failure_metrics.failure_rate_pct}%`);
    lines.push(`- Affected tenants: ${evidence.affected_tenants.length}`);
  }
  
  if (incident.scenario_id === 'rls-bypass') {
    lines.push(`- Exposed key type: ${evidence.exposed_keys[0]?.key_type || 'service_role'}`);
    lines.push(`- Exposed location: ${evidence.exposed_keys[0]?.exposed_in || 'unknown'}`);
    lines.push(`- Cross-tenant queries: ${evidence.cross_tenant_violations.length}`);
    lines.push(`- Affected victim tenants: ${evidence.affected_tenants.length}`);
  }
  
  if (incident.scenario_id === 'cross-tenant-exposure') {
    lines.push(`- Vulnerable query: ${evidence.cross_tenant_violations[0]?.query || 'unknown'}`);
    lines.push(`- Missing filter: tenant_id`);
    lines.push(`- Affected request count: ${evidence.auth_failure_metrics.failures_last_minute}`);
    lines.push(`- Data leaked between tenants: ${evidence.cross_tenant_violations.length} instances`);
  }
  
  return lines;
}

function generateTimelineLines(timeline) {
  const lines = [];
  const highlights = timeline.slice(0, 5); // First 5 key events
  
  for (const entry of highlights) {
    const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false });
    lines.push(`- ${time} — ${entry.message}`);
  }
  
  return lines;
}

function generateActionLines(recommendedAction) {
  if (recommendedAction.includes('1.')) {
    return recommendedAction.split(/\. /).map((s, i) => 
      s.trim() ? `${i + 1}. ${s.trim()}` : null
    ).filter(Boolean);
  }
  
  return [recommendedAction];
}

module.exports = { generateSummary };
