// intelligence-core/summaries/timeline.js
// Generates chronological timeline from event bucket

function generateTimeline(bucket, incident) {
  const events = bucket.events || [];
  
  // Sort events by timestamp
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.timestamp) - new Date(b.timestamp)
  );
  
  const timeline = [];
  
  // Add events
  for (const event of sortedEvents) {
    timeline.push({
      timestamp: event.timestamp,
      type: 'event',
      service: event.service,
      severity: event.severity,
      message: event.message,
      event_id: event.id
    });
  }
  
  // Add promotion marker
  timeline.push({
    timestamp: incident.opened_at,
    type: 'promotion',
    service: 'intelligence-core',
    severity: incident.severity,
    message: `Incident promoted: ${incident.title}`
  });
  
  return timeline;
}

module.exports = { generateTimeline };
