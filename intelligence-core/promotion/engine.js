// intelligence-core/promotion/engine.js
// Incident promotion logic

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

function promoteIncident(bucket) {
  const incidentId = `inc_${Date.now()}`;
  const events = bucket.events;
  
  // Determine severity based on event types
  const severity = determineSeverity(events, bucket);
  
  // Calculate probable origin
  const origin = calculateProbableOrigin(events, bucket);
  
  // Determine affected components
  const affectedComponents = Array.from(bucket.services);
  
  // Extract affected tenants
  const affectedTenants = Array.from(bucket.tenant_ids);
  
  // Determine scenario type
  const scenarioId = detectScenario(events);
  
  // Determine compliance impact
  const complianceImpact = determineComplianceImpact(events, scenarioId);
  
  // Generate title
  const title = generateTitle(events, scenarioId);
  
  const incident = {
    id: incidentId,
    status: 'open',
    severity,
    title,
    opened_at: new Date().toISOString(),
    promoted_from_event_bucket: bucket.key,
    primary_service: origin.service,
    affected_components: affectedComponents,
    probable_origin: origin,
    affected_tenants: affectedTenants,
    compliance_impact: complianceImpact,
    scenario_id: scenarioId,
    timeline_ref: `artifacts/incidents/${incidentId}/timeline.json`,
    evidence_ref: `artifacts/incidents/${incidentId}/evidence-bundle.json`,
    summary_ref: `artifacts/incidents/${incidentId}/summary.md`,
    runbook_ref: getRunbookForScenario(scenarioId),
    correlated_events: events.map(e => e.id)
  };
  
  return incident;
}

function determineSeverity(events, bucket) {
  const hasCritical = events.some(e => e.severity === 'critical');
  const hasSecurityKeyword = events.some(e => 
    e.message && (
      e.message.includes('exposed') ||
      e.message.includes('bypass') ||
      e.message.includes('cross-tenant') ||
      e.message.includes('breach')
    )
  );
  
  // Security incidents = P1
  if (hasCritical || hasSecurityKeyword) return 'P1';
  
  // Multiple services affected = P2
  if (bucket.services.size >= 2) return 'P2';
  
  return 'P2';
}

function calculateProbableOrigin(events, bucket) {
  // Find earliest failure
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  const earliestEvent = sortedEvents[0];
  const service = earliestEvent.service;
  
  // Calculate confidence based on event distribution
  const serviceEventCounts = {};
  for (const event of events) {
    serviceEventCounts[event.service] = (serviceEventCounts[event.service] || 0) + 1;
  }
  
  const maxCount = Math.max(...Object.values(serviceEventCounts));
  const confidence = Math.min(0.95, 0.6 + (maxCount / events.length) * 0.35);
  
  return {
    service,
    confidence: Math.round(confidence * 100) / 100,
    reason: `earliest failure in ${service}, ${maxCount} related events`
  };
}

function detectScenario(events) {
  const messages = events.map(e => e.message || '').join(' ').toLowerCase();
  
  if (messages.includes('jwks') || messages.includes('key') && messages.includes('rotation')) {
    return 'jwks-rotation-failure';
  }
  
  if (messages.includes('exposed') || messages.includes('service_role') || messages.includes('rls bypass')) {
    return 'rls-bypass';
  }
  
  if (messages.includes('cross-tenant') || messages.includes('tenant filter') || messages.includes('isolation violation')) {
    return 'cross-tenant-exposure';
  }
  
  return 'unknown';
}

function determineComplianceImpact(events, scenarioId) {
  if (scenarioId === 'rls-bypass') return 'DATA_BREACH_POTENTIAL';
  if (scenarioId === 'cross-tenant-exposure') return 'GDPR_ARTICLE_32_BREACH';
  if (scenarioId === 'jwks-rotation-failure') return 'AUTH_OUTAGE';
  return 'OPERATIONAL_IMPACT';
}

function generateTitle(events, scenarioId) {
  if (scenarioId === 'jwks-rotation-failure') {
    return 'JWKS rotation mismatch — token validation failing across tenants';
  }
  
  if (scenarioId === 'rls-bypass') {
    return 'Service role key exposed in frontend — RLS bypassed across tenants';
  }
  
  if (scenarioId === 'cross-tenant-exposure') {
    return 'Cross-tenant data exposure in endpoint';
  }
  
  // Generic title
  const services = [...new Set(events.map(e => e.service))].join(', ');
  return `Multiple failures detected in ${services}`;
}

function getRunbookForScenario(scenarioId) {
  const runbooks = {
    'jwks-rotation-failure': 'runbooks/jwks-rotation-failure.md',
    'rls-bypass': 'runbooks/rls-bypass.md',
    'cross-tenant-exposure': 'runbooks/cross-tenant-exposure.md',
    'unknown': 'runbooks/general-auth-triage.md'
  };
  
  return runbooks[scenarioId] || runbooks['unknown'];
}

module.exports = { promoteIncident };
