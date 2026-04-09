# Artifact Schema — Identity / JWKS / Entitlement Guardian

Every promoted incident must generate these 4 files under `artifacts/incidents/<incident-id>/`. Audit scripts generate reports under `artifacts/audits/`.

## 1. incident.json

Canonical promoted incident record.

```json
{
  "id": "inc_001",
  "status": "open",
  "severity": "P1",
  "title": "JWKS rotation mismatch — token validation failing across tenants",
  "opened_at": "2026-04-06T08:00:00.000Z",
  "promoted_from_event_bucket": "auth:system",
  "primary_service": "jwks-server",
  "affected_components": ["auth", "api"],
  "probable_origin": {
    "service": "jwks-server",
    "confidence": 0.95,
    "reason": "key rotation preceded validation failures"
  },
  "timeline_ref": "artifacts/incidents/inc_001/timeline.json",
  "evidence_ref": "artifacts/incidents/inc_001/evidence-bundle.json",
  "summary_ref": "artifacts/incidents/inc_001/summary.md",
  "runbook_ref": "runbooks/jwks-rotation-failure.md",
  "correlated_events": ["evt_001", "evt_002", "evt_003"],
  "affected_tenants": ["tenant_0", "tenant_1", "tenant_2"],
  "compliance_impact": "AUTH_OUTAGE"
}
```

## 2. timeline.json

Chronological incident history.

```json
[
  {
    "timestamp": "2026-04-06T07:59:55.000Z",
    "type": "event",
    "service": "jwks-server",
    "severity": "info",
    "message": "Key rotation initiated: key_2026_001 -> key_2026_002",
    "event_id": "evt_001"
  },
  {
    "timestamp": "2026-04-06T08:00:00.000Z",
    "type": "event",
    "service": "auth",
    "severity": "warning",
    "message": "JWT signature validation failed: kid=key_2026_002 not in cache",
    "event_id": "evt_002"
  },
  {
    "timestamp": "2026-04-06T08:00:05.000Z",
    "type": "event",
    "service": "auth",
    "severity": "critical",
    "message": "Auth failure rate spike: 92% of requests failing",
    "event_id": "evt_003"
  },
  {
    "timestamp": "2026-04-06T08:00:10.000Z",
    "type": "promotion",
    "service": "intelligence-core",
    "severity": "P1",
    "message": "Incident promoted: JWKS rotation mismatch"
  }
]
```

## 3. evidence-bundle.json

Identity-specific evidence snapshot. This is the most important artifact for reviewer trust.

**Required keys:**
- `incident_id`
- `captured_at`
- `checksum`
- `scenario_id`
- `component_health`
- `jwks_state`
- `auth_failure_metrics`
- `affected_tenants`
- `exposed_keys`
- `cross_tenant_violations`
- `compliance_impact`
- `recent_logs`
- `triggering_events`
- `recommended_action`

```json
{
  "incident_id": "inc_001",
  "captured_at": "2026-04-06T08:00:00.000Z",
  "checksum": "sha256:abc123def456...",
  "scenario_id": "jwks-rotation-failure",
  "component_health": {
    "api": "operational",
    "auth": "down",
    "jwks-server": "degraded",
    "database": "operational"
  },
  "jwks_state": {
    "current_kid": "key_2026_002",
    "previous_kid": "key_2026_001",
    "rotation_age_seconds": 45,
    "validators_with_stale_cache": 7,
    "active_keys_count": 2,
    "keys": [
      { "kid": "key_2026_002", "status": "active", "created_at": "2026-04-06T08:00:00.000Z" },
      { "kid": "key_2026_001", "status": "rotating", "created_at": "2026-03-01T00:00:00.000Z" }
    ]
  },
  "auth_failure_metrics": {
    "failures_last_minute": 23,
    "unique_tenants_affected": 7,
    "failure_rate_pct": 92,
    "error_type": "jwt_signature_invalid"
  },
  "affected_tenants": ["tenant_0", "tenant_1", "tenant_2", "tenant_3", "tenant_4", "tenant_5", "tenant_6"],
  "exposed_keys": [],
  "cross_tenant_violations": [],
  "compliance_impact": "AUTH_OUTAGE",
  "recent_logs": [
    { "timestamp": "2026-04-06T08:00:00.000Z", "level": "error", "message": "JWT validation failed" }
  ],
  "triggering_events": ["evt_001", "evt_002", "evt_003"],
  "recommended_action": "Force JWKS cache refresh on all validators within 60 seconds"
}
```

### Evidence Bundle Variants

**For RLS Bypass scenario:**
```json
{
  "exposed_keys": [
    {
      "key_type": "service_role",
      "exposed_in": "frontend_bundle.js",
      "exposed_at": "2026-04-06T08:00:00.000Z"
    }
  ],
  "cross_tenant_violations": [
    { "source_tenant": "attacker_tenant", "victim_tenant": "tenant_0", "query": "customer_records" }
  ],
  "compliance_impact": "DATA_BREACH_POTENTIAL",
  "recommended_action": "1. Rotate service role key immediately. 2. Audit logs for unauthorized queries. 3. Notify affected customers per breach policy."
}
```

**For Cross-Tenant Exposure scenario:**
```json
{
  "vulnerable_query": "list_customer_orders",
  "missing_filter": "tenant_id",
  "affected_request_count": 8,
  "data_leaked_between_tenants": [
    { "source": "tenant_0", "visible_to": "tenant_1" },
    { "source": "tenant_2", "visible_to": "tenant_5" }
  ],
  "compliance_impact": "GDPR_ARTICLE_32_BREACH",
  "recommended_action": "1. Disable endpoint immediately. 2. Audit access logs. 3. Notify legal/compliance team. 4. Patch query with tenant filter."
}
```

## 4. summary.md

Markdown summary. Must contain these sections in order:

```markdown
# Incident: JWKS Rotation Mismatch

## Metadata
| Field | Value |
|-------|-------|
| Incident ID | inc_001 |
| Severity | P1 |
| Status | open |
| Opened | 2026-04-06T08:00:00.000Z |
| Primary Service | jwks-server |
| Compliance Impact | AUTH_OUTAGE |

## What Happened
A signing key was rotated on the JWKS server. Validators with stale JWKS cache rejected new tokens, causing authentication failures across 7 tenants.

## Evidence Captured
- Current key ID: key_2026_002
- Previous key ID: key_2026_001
- Validators with stale cache: 7
- Auth failure rate: 92%
- Affected tenants: 7

## Timeline Highlights
- 07:59:55 — Key rotation initiated
- 08:00:00 — First validation failure
- 08:00:05 — Auth failure rate spike detected
- 08:00:10 — Incident promoted

## Recommended Next Actions
1. Force JWKS cache refresh on all validators
2. Monitor auth failure rate for recovery
3. Review key rotation procedure for cache invalidation

**Runbook:** [jwks-rotation-failure.md](../runbooks/jwks-rotation-failure.md)
```

## 5. Audit Artifacts

### jwks-audit-YYYY-MM-DD.json

```json
{
  "audit_type": "jwks",
  "audited_at": "2026-04-06T08:30:00.000Z",
  "checks": [
    {
      "name": "keys_within_rotation_window",
      "status": "passed",
      "detail": "All keys rotated within 90 days"
    },
    {
      "name": "no_keys_older_than_90_days",
      "status": "passed",
      "detail": "Oldest key is 36 days old"
    },
    {
      "name": "validators_using_current_kid",
      "status": "failed",
      "detail": "7 validators using stale key key_2026_001"
    },
    {
      "name": "rotation_history_complete",
      "status": "passed",
      "detail": "3 rotations recorded"
    }
  ],
  "summary": {
    "passed": 3,
    "failed": 1,
    "total": 4
  },
  "current_kid": "key_2026_002",
  "stale_validators": 7
}
```

### tenant-audit-YYYY-MM-DD.json

```json
{
  "audit_type": "tenants",
  "audited_at": "2026-04-06T08:30:00.000Z",
  "checks": [
    {
      "name": "all_queries_filtered_by_tenant",
      "status": "failed",
      "detail": "Query 'list_customer_orders' missing tenant_id filter"
    },
    {
      "name": "no_tenant_boundaries_violated",
      "status": "passed",
      "detail": "No cross-tenant queries in last 24 hours"
    },
    {
      "name": "no_exposed_service_role_keys",
      "status": "passed",
      "detail": "Service role key not detected in public locations"
    }
  ],
  "summary": {
    "passed": 2,
    "failed": 1,
    "total": 3
  },
  "vulnerable_queries": ["list_customer_orders"]
}
```

### entitlement-audit-YYYY-MM-DD.json

```json
{
  "audit_type": "entitlements",
  "audited_at": "2026-04-06T08:30:00.000Z",
  "checks": [
    {
      "name": "roles_consistent_across_tenants",
      "status": "passed",
      "detail": "All tenants use standard role set"
    },
    {
      "name": "no_over_privileged_tokens",
      "status": "passed",
      "detail": "No tokens with admin scope detected"
    },
    {
      "name": "no_deprecated_permissions_in_use",
      "status": "passed",
      "detail": "All permissions are current"
    }
  ],
  "summary": {
    "passed": 3,
    "failed": 0,
    "total": 3
  }
}
```

## Quality Rules

- Artifacts must be deterministic and readable
- Do not omit checksum from evidence bundle
- Do not generate empty timeline or empty summary files
- The UI must be able to render all 4 artifacts without transformation errors
- Security incidents must have compliance_impact field
- Audit reports must include pass/fail summary
