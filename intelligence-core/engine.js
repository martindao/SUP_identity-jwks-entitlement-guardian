// intelligence-core/engine.js
// Main intelligence core: ingests events from shared runtime store, correlates, promotes incidents, generates artifacts

const fs = require('fs');
const path = require('path');
const store = require('../runtime/store');
const { correlateEvents } = require('./correlation/bucket');
const { promoteIncident } = require('./promotion/engine');
const { captureEvidence } = require('./evidence/snapshot');
const { generateTimeline } = require('./summaries/timeline');
const { generateSummary } = require('./summaries/summary');

const ARTIFACTS_DIR = path.join(__dirname, '..', 'artifacts');
const INCIDENTS_DIR = path.join(ARTIFACTS_DIR, 'incidents');

if (!fs.existsSync(INCIDENTS_DIR)) {
  fs.mkdirSync(INCIDENTS_DIR, { recursive: true });
}

let lastProcessedEventCount = 0;
let activeBuckets = {};
let promotedIncidents = [];

function ingestNewEvents() {
  const allEvents = store.getNewEvents(0);
  const newEvents = allEvents.slice(lastProcessedEventCount);
  lastProcessedEventCount = allEvents.length;
  return newEvents;
}

function processEvents(events) {
  if (events.length === 0) return;

  // Correlate events into buckets
  const buckets = correlateEvents(events, activeBuckets);
  activeBuckets = buckets.active;

  // Check for promotions
  for (const [bucketKey, bucket] of Object.entries(buckets.promoted)) {
    if (promotedIncidents.find(inc => inc.promoted_from_event_bucket === bucketKey)) continue;

    const incident = promoteIncident(bucket);
    promotedIncidents.push(incident);

    // Generate artifacts
    const incidentDir = path.join(INCIDENTS_DIR, incident.id);
    fs.mkdirSync(incidentDir, { recursive: true });

    // Evidence snapshot from shared runtime store
    const evidence = captureEvidence(incident);
    fs.writeFileSync(
      path.join(incidentDir, 'evidence-bundle.json'),
      JSON.stringify(evidence, null, 2)
    );
    incident.evidence_ref = `artifacts/incidents/${incident.id}/evidence-bundle.json`;

    // Timeline
    const timeline = generateTimeline(bucket, incident);
    fs.writeFileSync(
      path.join(incidentDir, 'timeline.json'),
      JSON.stringify(timeline, null, 2)
    );
    incident.timeline_ref = `artifacts/incidents/${incident.id}/timeline.json`;

    // Summary
    const summary = generateSummary(incident, evidence, timeline);
    fs.writeFileSync(
      path.join(incidentDir, 'summary.md'),
      summary
    );
    incident.summary_ref = `artifacts/incidents/${incident.id}/summary.md`;

    // Incident record
    fs.writeFileSync(
      path.join(incidentDir, 'incident.json'),
      JSON.stringify(incident, null, 2)
    );

    console.log(`\n[INCIDENT PROMOTED] ${incident.id}: ${incident.title}`);
    console.log(`  Severity: ${incident.severity}`);
    console.log(`  Origin: ${incident.probable_origin.service} (${Math.round(incident.probable_origin.confidence * 100)}% confidence)`);
    console.log(`  Affected Tenants: ${incident.affected_tenants.length}`);
    console.log(`  Compliance Impact: ${incident.compliance_impact}`);
    console.log(`  Artifacts: ${incidentDir}`);
  }
}

// Main polling loop
setInterval(() => {
  const events = ingestNewEvents();
  processEvents(events);
}, 1000);

// Expose for testing
function resetEngine() {
  lastProcessedEventCount = 0;
  activeBuckets = {};
  promotedIncidents = [];
}

module.exports = { ingestNewEvents, processEvents, getPromotedIncidents: () => promotedIncidents, resetEngine };
