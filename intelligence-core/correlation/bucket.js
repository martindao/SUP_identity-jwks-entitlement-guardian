// intelligence-core/correlation/bucket.js
// Dwell-time based event correlation

const DWELL_WINDOW_MS = 30000; // 30 seconds
const MAX_BUCKET_SIZE = 50;
const PROMOTION_THRESHOLD = 5;

function getBucketKey(event) {
  // Group by correlation_key if present, else by service
  return event.correlation_key || `service:${event.service}`;
}

function correlateEvents(events, activeBuckets) {
  const now = Date.now();
  const promoted = [];

  for (const event of events) {
    const key = getBucketKey(event);
    
    if (!activeBuckets[key]) {
      activeBuckets[key] = {
        key,
        events: [],
        created_at: now,
        last_event_at: now,
        services: new Set(),
        severities: new Set(),
        tenant_ids: new Set()
      };
    }

    const bucket = activeBuckets[key];
    bucket.events.push(event);
    bucket.last_event_at = now;
    bucket.services.add(event.service);
    bucket.severities.add(event.severity);
    if (event.tenant_id) bucket.tenant_ids.add(event.tenant_id);

    // Check promotion conditions
    const shouldPromote = checkPromotion(bucket);
    if (shouldPromote) {
      promoted.push(bucket);
      delete activeBuckets[key];
    }
  }

  // Remove stale buckets
  for (const [key, bucket] of Object.entries(activeBuckets)) {
    if (now - bucket.last_event_at > DWELL_WINDOW_MS * 2) {
      delete activeBuckets[key];
    }
  }

  return { active: activeBuckets, promoted };
}

function checkPromotion(bucket) {
  const eventCount = bucket.events.length;
  const hasCritical = bucket.severities.has('critical');
  const hasError = bucket.severities.has('error');
  const hasWarning = bucket.severities.has('warning');

  // Promotion rules (in order of priority):
  // 1. 5+ events
  if (eventCount >= PROMOTION_THRESHOLD) return true;
  
  // 2. Critical + 2+ events
  if (hasCritical && eventCount >= 2) return true;
  
  // 3. Error + multiple services + 3+ events
  if (hasError && bucket.services.size >= 2 && eventCount >= 3) return true;

  return false;
}

module.exports = { correlateEvents, checkPromotion, getBucketKey };
