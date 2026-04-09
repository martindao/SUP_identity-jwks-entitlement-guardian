# API Contract — Identity / JWKS / Entitlement Guardian

This file is the source of truth for the repo's HTTP surface. Any AI building this repo must follow these request/response contracts exactly unless there is a documented reason to extend them.

## General Rules

- Content type for JSON routes: `application/json`
- All successful POST simulation endpoints return `{ success: true, scenario: <name> }`
- All failed requests return `{ success: false, error: <message> }`
- The support console depends on these routes. Do not rename them casually.

---

## 1. Console and Artifact Routes

### `GET /`
Serve `support-console/ui/index.html`

### `GET /api/incidents`
Returns all promoted incidents sorted newest-first.

**Response 200**
```json
[
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
]
```

### `GET /api/incidents/:id/incident.json`
Returns one incident record.

### `GET /api/incidents/:id/timeline.json`
Returns timeline entries for one incident.

### `GET /api/incidents/:id/evidence-bundle.json`
Returns evidence bundle for one incident.

### `GET /api/incidents/:id/summary.md`
Returns markdown summary text for one incident.

### `GET /runbooks/:name`
Returns the requested runbook markdown.

---

## 2. Health and Runtime Routes

### `GET /api/health`
Returns current component health.

**Response 200**
```json
{
  "api": "operational",
  "auth": "degraded",
  "jwks-server": "degraded",
  "database": "operational",
  "tenant-store": "operational"
}
```

### `POST /api/reset`
Clears runtime state and incident artifacts.

**Response 200**
```json
{ "success": true }
```

---

## 3. Simulation Routes

### `POST /api/simulate/jwks-rotation`
Triggers JWKS rotation failure scenario.

**Request Body**
No body required.

**Response 200**
```json
{
  "success": true,
  "scenario": "jwks-rotation",
  "details": {
    "old_kid": "key_2026_001",
    "new_kid": "key_2026_002",
    "validators_with_stale_cache": 7,
    "affected_tenants": 10
  }
}
```

**Behavior:**
- Rotates signing key on JWKS server
- Issues 10 new tokens with new key
- Validators with stale cache reject tokens
- Generates auth failure events

### `POST /api/simulate/rls-bypass`
Triggers service role key exposure scenario.

**Response 200**
```json
{
  "success": true,
  "scenario": "rls-bypass",
  "details": {
    "exposed_key_type": "service_role",
    "exposed_in": "frontend_bundle.js",
    "cross_tenant_queries": 5,
    "affected_victim_tenants": 5
  }
}
```

**Behavior:**
- Marks service role key as exposed
- Simulates cross-tenant queries
- Generates security violation events

### `POST /api/simulate/cross-tenant`
Triggers cross-tenant data exposure scenario.

**Response 200**
```json
{
  "success": true,
  "scenario": "cross-tenant",
  "details": {
    "vulnerable_query": "list_customer_orders",
    "missing_filter": "tenant_id",
    "affected_request_count": 8,
    "data_leaked_between_tenants": ["tenant_0->tenant_1", "tenant_2->tenant_5"]
  }
}
```

**Behavior:**
- Registers query missing tenant filter
- Simulates users running broken query
- Generates tenant isolation violation events

---

## 4. Audit Routes

### `POST /api/audit/jwks`
Runs JWKS rotation health audit.

**Response 200**
```json
{
  "success": true,
  "audit": "jwks",
  "report_ref": "artifacts/audits/jwks-audit-2026-04-06.json",
  "summary": {
    "passed": 4,
    "failed": 1,
    "checks": [
      { "name": "keys_within_rotation_window", "status": "passed" },
      { "name": "no_keys_older_than_90_days", "status": "passed" },
      { "name": "validators_using_current_kid", "status": "failed", "detail": "7 validators using stale key" },
      { "name": "rotation_history_complete", "status": "passed" }
    ]
  }
}
```

### `POST /api/audit/tenants`
Runs tenant isolation audit.

**Response 200**
```json
{
  "success": true,
  "audit": "tenants",
  "report_ref": "artifacts/audits/tenant-audit-2026-04-06.json",
  "summary": {
    "passed": 3,
    "failed": 2,
    "checks": [
      { "name": "all_queries_filtered_by_tenant", "status": "failed", "detail": "list_customer_orders missing filter" },
      { "name": "no_tenant_boundaries_violated", "status": "failed", "detail": "8 cross-tenant queries detected" },
      { "name": "no_exposed_service_role_keys", "status": "passed" }
    ]
  }
}
```

### `POST /api/audit/entitlements`
Runs entitlement drift audit.

**Response 200**
```json
{
  "success": true,
  "audit": "entitlements",
  "report_ref": "artifacts/audits/entitlement-audit-2026-04-06.json",
  "summary": {
    "passed": 5,
    "failed": 0,
    "checks": [
      { "name": "roles_consistent_across_tenants", "status": "passed" },
      { "name": "no_over_privileged_tokens", "status": "passed" },
      { "name": "no_deprecated_permissions_in_use", "status": "passed" }
    ]
  }
}
```

---

## 5. JWKS Server Endpoints (Internal)

These are the endpoints the API uses to validate tokens:

### `GET /.well-known/jwks.json`
Returns current JWKS.

**Response 200**
```json
{
  "keys": [
    {
      "kid": "key_2026_002",
      "kty": "RSA",
      "alg": "RS256",
      "use": "sig",
      "n": "...",
      "e": "AQAB"
    },
    {
      "kid": "key_2026_001",
      "kty": "RSA",
      "alg": "RS256",
      "use": "sig",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

### `POST /admin/rotate-key`
Rotates the signing key (admin endpoint).

**Response 200**
```json
{
  "success": true,
  "old_kid": "key_2026_001",
  "new_kid": "key_2026_002",
  "rotated_at": "2026-04-06T08:00:00.000Z"
}
```

---

## 6. Optional Extension Routes (MVP+)

### `GET /api/jwks/status`
Returns JWKS-specific metrics.

### `GET /api/tenants/:id`
Returns tenant-specific details.

These are optional. Do not block the MVP on them.

---

## Implementation Notes

- The server must send **no-cache headers** on HTML and markdown responses.
- The UI assumes the artifact endpoints are directly readable in the browser.
- JWT signing/verification must use the `jose` library (industry standard).
- Audit endpoints should generate reports under `artifacts/audits/`.
- Security incidents should have compliance impact labels.
