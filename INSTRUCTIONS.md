# Repo 03 — Identity / JWKS / Entitlement Guardian

## Quick Start For AI Agents

**If you are an AI reading this:** Your job is to build this repo following the exact pattern of `SUP_incident-intelligence-fastpath`, which already exists at `C:\Users\marti\Desktop\Projects\SUP_incident-intelligence-fastpath`.

**Reference repo to clone patterns from:** `SUP_incident-intelligence-fastpath`

**Do not reinvent architecture.** Copy the structural patterns from repo-01 / SUP_incident-intelligence-fastpath and adapt them to identity/auth/entitlement domain.

---

## Repo Identity

- **Folder name:** `identity-jwks-entitlement-guardian`
- **GitHub repo name:** `identity-jwks-entitlement-guardian`
- **Public title:** Identity / JWKS / Entitlement Guardian
- **Tagline:** "When auth breaks at 2am, this is what tells you which keys rotated wrong and which tenants are exposed."
- **Target hiring role:** Application Support Engineer at multi-tenant SaaS / Fintech
- **Hiring-manager pitch:** "I handle the operational pain of identity systems — JWKS rotations, token validation failures, tenant isolation audits, entitlement drift — so your security team doesn't get paged for support-tier issues."

---

## What This Repo Proves

Martin Dao can:
- Diagnose JWKS caching and rotation failures in real time
- Detect cross-tenant data exposure and entitlement drift
- Audit RLS misconfigurations and over-privileged keys
- Reduce auth-related support tickets by 50%+
- Generate evidence-backed incident artifacts for security review
- Handle the boundary between support and security without escalating everything

---

## Source Research (Real 2025-2026 Evidence)

These are the **real incidents and engineering writeups** that prove this problem is expensive. Study them before building. Do NOT cite them in the public README.

### Primary Sources (Verified, Use These)

#### 1. Logto: JWKS Caching + Signing Key Rotation Mismatch (2026)
- **URL:** https://blog.logto.io/postmortem-jwks-cache
- **Key lesson:** JWKS caching combined with signing key rotation caused token validation failures. Tests didn't cover production-like caching. Customers couldn't authenticate.
- **Use this for:** Scenario 1 (JWKS Rotation Failure)

#### 2. Cloudflare: Identity-Dependent Flow Outage (June 2025)
- **URL:** https://blog.cloudflare.com/cloudflare-service-outage-june-12-2025/
- **Key lesson:** Dependency outage broke identity-dependent flows (SCIM updates, token refresh). Identity is a dependency graph, not a single service. Fail-closed behavior cascaded.
- **Use this for:** Detection logic and escalation framing

#### 3. Supabase: RLS and Key Privilege Documentation (2026)
- **URL:** https://supabase.com/docs/guides/database/secure-data
- **URL:** https://supabase.com/docs/guides/api/api-keys
- **Key lesson:** Anon key is safe ONLY when RLS is enabled. Service role key is NEVER safe to expose. Misconfigured RLS makes "public keys" act like admin keys.
- **Use this for:** Scenario 2 (RLS Bypass / Cross-Tenant Exposure)

#### 4. Cloudflare: Salesloft/Drift Security Incident (2025)
- **URL:** https://blog.cloudflare.com/response-to-salesloft-drift-incident/
- **Key lesson:** Third-party integration compromise exfiltrated support case text (potential secrets). Required org-wide secret scanning and rotation.
- **Use this for:** Detection patterns for entitlement drift

#### 5. Auth0/Okta Engineering Blog
- Search for: "key rotation", "JWKS cache", "entitlement audit"
- **Use this for:** Industry-standard rotation patterns

### Secondary Sources
- IETF RFC 7517 (JSON Web Key) — for JWKS technical correctness
- OWASP Authentication Cheat Sheet — for security framing in runbooks

### What to Extract From Each Source
- **Failure mode:** What specifically broke (cache key mismatch, RLS bypass, key reuse)
- **Detection gap:** What monitoring missed
- **Recovery steps:** What engineers did manually
- **Customer impact:** Who was affected and how
- **Time to detect vs. time to resolve:** MTTR drivers

---

## Architecture (Clone From repo-01 / SUP_incident-intelligence-fastpath Pattern)

```
identity-jwks-entitlement-guardian/
├── app-under-test/
│   ├── api/
│   │   └── server.js              # Multi-tenant API with JWT auth
│   ├── auth/
│   │   ├── jwks-server.js         # Simulated JWKS endpoint
│   │   └── token-issuer.js        # JWT issuer with rotation
│   └── shared/
│       └── tenant-store.js        # Multi-tenant data with RLS
├── runtime/
│   ├── store.js                   # File-backed shared state
│   ├── jwks-state.json            # Current keys, rotation history
│   ├── tenant-state.json          # Tenant-to-key mappings
│   ├── component-health.json
│   ├── logs.ndjson
│   ├── scenario-mode.json
│   └── incidents/
├── intelligence-core/
│   ├── engine.js
│   ├── correlation/bucket.js
│   ├── promotion/engine.js
│   ├── evidence/snapshot.js       # Identity-specific evidence
│   └── summaries/
│       ├── timeline.js
│       └── summary.js
├── auditors/                       # NEW: Auditor scripts
│   ├── jwks-rotation-audit.js     # Check key rotation health
│   ├── tenant-isolation-audit.js  # Check RLS configuration
│   └── entitlement-audit.js       # Check role/permission consistency
├── scenarios/
│   ├── jwks-rotation-failure/
│   ├── rls-bypass/
│   └── cross-tenant-exposure/
├── support-console/
│   ├── server.js
│   └── ui/index.html
├── runbooks/
│   ├── jwks-rotation-failure.md
│   ├── rls-bypass.md
│   ├── cross-tenant-exposure.md
│   └── general-auth-triage.md
├── artifacts/incidents/
├── tests/
│   ├── run-tests.js
│   └── integration.js
├── docs/
│   ├── research-blueprint.md
│   ├── incident-schema.md
│   ├── scenario-contracts.md
│   ├── jwt-architecture.md         # NEW: Explain JWT/JWKS basics
│   └── tenant-isolation-model.md   # NEW: Explain multi-tenancy
├── package.json
├── README.md
└── .gitignore
```

---

## Required Dependencies (package.json)

```json
{
  "name": "identity-jwks-entitlement-guardian",
  "version": "1.0.0",
  "description": "Identity, JWKS rotation, and entitlement audit console for application support",
  "scripts": {
    "start:api": "node app-under-test/api/server.js",
    "start:jwks": "node app-under-test/auth/jwks-server.js",
    "start:intelligence": "node intelligence-core/engine.js",
    "start:console": "node support-console/server.js",
    "start:all": "concurrently -n api,jwks,intel,console -c blue,green,yellow,magenta \"npm run start:api\" \"npm run start:jwks\" \"npm run start:intelligence\" \"npm run start:console\"",
    "audit:jwks": "node auditors/jwks-rotation-audit.js",
    "audit:tenants": "node auditors/tenant-isolation-audit.js",
    "audit:entitlements": "node auditors/entitlement-audit.js",
    "scenario:jwks-rotation": "node scenarios/jwks-rotation-failure/inject.js",
    "scenario:rls-bypass": "node scenarios/rls-bypass/inject.js",
    "scenario:cross-tenant": "node scenarios/cross-tenant-exposure/inject.js",
    "reset": "node -e \"require('./runtime/store').resetRuntime(); console.log('Runtime cleared.')\"",
    "test": "node tests/run-tests.js",
    "test:integration": "node tests/integration.js"
  },
  "dependencies": {
    "concurrently": "^8.2.2",
    "chalk": "^4.1.2",
    "jose": "^5.2.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.41.0"
  }
}
```

**Why these dependencies:**
- `concurrently` — multi-process startup
- `chalk` — colored terminal output for auditor scripts
- `jose` — REAL JWT/JWKS library (industry standard) — proves you know auth tooling
- `uuid` — tenant and key ID generation
- `@playwright/test` — browser tests

**IMPORTANT:** Use `jose` for actual JWT signing/verification. This is the industry-standard library. Do not implement crypto from scratch.

---

## Deterministic Scenarios (3 Required)

### Scenario 1: JWKS Rotation Failure (Inspired by Logto incident)

**What breaks:** A signing key is rotated. New tokens are issued with the new key. Validators with stale JWKS cache reject the new tokens. Customers can't authenticate.

**Simulated via:**
```javascript
// scenarios/jwks-rotation-failure/inject.js
async function injectJWKSRotationFailure() {
  await fetch('http://localhost:3001/api/scenario', {
    method: 'POST',
    body: JSON.stringify({ mode: 'jwks-rotation' })
  });

  // 1. Rotate the signing key on the JWKS server
  await fetch('http://localhost:3002/admin/rotate-key', { method: 'POST' });

  // 2. Issue 10 new tokens with the new key
  for (let i = 0; i < 10; i++) {
    await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: `tenant_${i}`, user_id: `user_${i}` })
    });
  }

  // 3. Try to validate with stale cache
  // (validators with cached JWKS will fail)
  for (let i = 0; i < 10; i++) {
    await fetch('http://localhost:3001/api/protected', {
      method: 'GET',
      headers: { Authorization: `Bearer <new_token>` }
    });
  }
}
```

**Expected detection:**
- `jwt_signature_invalid` errors (10+)
- `jwks_cache_stale` warnings
- `auth_failure_rate_spike` event
- Component health: `auth = degraded`

**Expected promoted incident:**
- Severity: P1
- Title: "JWKS rotation mismatch — token validation failing across tenants"
- Probable origin: jwks-server (95% confidence)
- Affected components: auth, api

**Expected artifacts:**
- All 4 standard files
- Evidence bundle MUST include:
  - `current_kid: "key_2026_002"` (new key ID)
  - `cached_kid: "key_2026_001"` (stale key ID)
  - `affected_tokens: 10`
  - `affected_tenants: ["tenant_0", "tenant_1", ...]`
  - `time_since_rotation_seconds: 45`
  - `recommended_action: "Force JWKS cache refresh on all validators"`
- Runbook: `runbooks/jwks-rotation-failure.md`

---

### Scenario 2: RLS Bypass (Inspired by Supabase docs)

**What breaks:** A developer accidentally uses the service role key in a frontend bundle. RLS is bypassed. Any user can read any tenant's data.

**Simulated via:**
```javascript
// scenarios/rls-bypass/inject.js
async function injectRLSBypass() {
  await fetch('http://localhost:3001/api/scenario', {
    method: 'POST',
    body: JSON.stringify({ mode: 'rls-bypass' })
  });

  // 1. Mark the service role key as "exposed"
  await fetch('http://localhost:3001/api/keys/expose', {
    method: 'POST',
    body: JSON.stringify({ key_type: 'service_role', exposed_in: 'frontend_bundle.js' })
  });

  // 2. Simulate cross-tenant queries using the exposed key
  for (let i = 0; i < 5; i++) {
    await fetch('http://localhost:3001/api/data/query', {
      method: 'POST',
      headers: { 'X-Auth-Key': 'service_role_key_exposed' },
      body: JSON.stringify({ tenant_id: `victim_tenant_${i}`, table: 'customer_records' })
    });
  }
}
```

**Expected detection:**
- `service_role_key_used_in_browser` critical event
- `cross_tenant_query_detected` errors
- `rls_bypass_warning` events
- Component health: `auth = down`, `database = down`

**Expected promoted incident:**
- Severity: P1 (security incident)
- Title: "Service role key exposed in frontend — RLS bypassed across tenants"
- Probable origin: api (90% confidence)
- Affected components: api, auth, database

**Expected artifacts:**
- All 4 standard files
- Evidence bundle MUST include:
  - `exposed_key_type: "service_role"`
  - `exposed_in: "frontend_bundle.js"`
  - `cross_tenant_queries_count: 5`
  - `affected_victim_tenants: ["victim_tenant_0", ...]`
  - `data_exfiltration_risk: "HIGH"`
  - `recommended_action: "1. Rotate service role key immediately. 2. Audit logs for unauthorized queries. 3. Notify affected customers per breach policy."`
- Runbook: `runbooks/rls-bypass.md` with security escalation criteria

---

### Scenario 3: Cross-Tenant Exposure (Original synthesis)

**What breaks:** A new feature introduces a query that doesn't include `tenant_id` filter. Tenant A's user runs the query and sees Tenant B's data.

**Simulated via:**
```javascript
// scenarios/cross-tenant-exposure/inject.js
async function injectCrossTenantExposure() {
  await fetch('http://localhost:3001/api/scenario', {
    method: 'POST',
    body: JSON.stringify({ mode: 'cross-tenant' })
  });

  // 1. Mark a query as missing tenant filter
  await fetch('http://localhost:3001/api/queries/register', {
    method: 'POST',
    body: JSON.stringify({
      query_name: 'list_customer_orders',
      missing_filter: 'tenant_id'
    })
  });

  // 2. Simulate users running the broken query
  for (let i = 0; i < 8; i++) {
    await fetch('http://localhost:3001/api/data/customer-orders', {
      method: 'GET',
      headers: { Authorization: `Bearer token_tenant_${i}` }
    });
  }
}
```

**Expected detection:**
- `query_missing_tenant_filter` warnings
- `cross_tenant_data_returned` errors
- `tenant_isolation_violation` critical events

**Expected promoted incident:**
- Severity: P1 (compliance incident)
- Title: "Cross-tenant data exposure in list_customer_orders endpoint"
- Probable origin: api (85% confidence)
- Affected components: api, database

**Expected artifacts:**
- All 4 standard files
- Evidence bundle MUST include:
  - `vulnerable_query: "list_customer_orders"`
  - `missing_filter: "tenant_id"`
  - `affected_request_count: 8`
  - `data_leaked_between_tenants: ["tenant_0->tenant_1", "tenant_2->tenant_5"]`
  - `compliance_impact: "GDPR Article 32 breach"`
  - `recommended_action: "1. Disable endpoint immediately. 2. Audit access logs. 3. Notify legal/compliance team. 4. Patch query with tenant filter."`
- Runbook: `runbooks/cross-tenant-exposure.md`

---

## Required Features (Match repo-01 / SUP_incident-intelligence-fastpath Quality Bar)

### 1. Runtime Store (`runtime/store.js`)

Clone from repo-01 / SUP_incident-intelligence-fastpath. Add identity-specific state:

```javascript
// Identity-specific state
function getJWKSState() {
  return readJSON(JWKS_FILE, {
    current_kid: 'key_default',
    keys: [
      { kid: 'key_default', algorithm: 'RS256', created_at: new Date().toISOString(), status: 'active' }
    ],
    rotation_history: [],
    cache_stale_validators: 0
  });
}

function rotateJWKSKey(newKid) {
  const state = getJWKSState();
  state.rotation_history.push({
    from_kid: state.current_kid,
    to_kid: newKid,
    rotated_at: new Date().toISOString()
  });
  state.keys.push({ kid: newKid, algorithm: 'RS256', created_at: new Date().toISOString(), status: 'active' });
  // Mark old key as rotating (still valid for grace period)
  state.keys = state.keys.map(k => k.kid === state.current_kid ? { ...k, status: 'rotating' } : k);
  state.current_kid = newKid;
  writeJSON(JWKS_FILE, state);
}

function getTenantState() {
  return readJSON(TENANT_FILE, {
    tenants: [],
    exposed_keys: [],
    cross_tenant_violations: []
  });
}
```

### 2. Live Simulation UI (CRITICAL)

Same UI requirements as repo-01 / SUP_incident-intelligence-fastpath and repo-02:
- 3 simulation buttons (JWKS Rotation, RLS Bypass, Cross-Tenant Exposure)
- Reset Console button
- Real-time incident queue
- Click-to-select incident detail
- Embedded timeline, evidence, runbook
- Component health panel
- Trust markers panel

**CRITICAL UI WARNING:** Write `index.html` in ONE pass. Do not edit large embedded scripts with partial edits. (Lesson from repo-01 / SUP_incident-intelligence-fastpath.)

#### Identity-Specific UI Additions
- **Auditor panel** (right sidebar, below Component Health):
  - "Run JWKS Audit" button → triggers `auditors/jwks-rotation-audit.js`
  - "Run Tenant Audit" button → triggers `auditors/tenant-isolation-audit.js`
  - "Run Entitlement Audit" button → triggers `auditors/entitlement-audit.js`
- **Audit results modal** that shows pass/fail per check

### 3. Server Endpoints (`support-console/server.js`)

```
GET  /
GET  /api/incidents
GET  /api/incidents/:id/incident.json
GET  /api/incidents/:id/timeline.json
GET  /api/incidents/:id/evidence-bundle.json
GET  /api/incidents/:id/summary.md
GET  /api/health
GET  /runbooks/:name
POST /api/simulate/jwks-rotation
POST /api/simulate/rls-bypass
POST /api/simulate/cross-tenant
POST /api/audit/jwks
POST /api/audit/tenants
POST /api/audit/entitlements
POST /api/reset
```

### 4. Auditor Scripts (NEW — Unique to This Repo)

These are command-line audit tools that can run independently OR via the UI.

#### `auditors/jwks-rotation-audit.js`
Checks:
- Are all keys within rotation window?
- Are any keys older than 90 days?
- Are validators using current `kid`?
- Output: `audit-report-jwks.json`

#### `auditors/tenant-isolation-audit.js`
Checks:
- Are all queries filtered by `tenant_id`?
- Are any tenant boundaries violated in recent logs?
- Are service role keys exposed anywhere?
- Output: `audit-report-tenants.json`

#### `auditors/entitlement-audit.js`
Checks:
- Are all roles consistent across tenants?
- Are there over-privileged keys?
- Are deprecated permissions still in use?
- Output: `audit-report-entitlements.json`

These prove Martin can build proactive audit tooling, not just reactive incident response.

### 5. Tests

**Unit tests target: 12+**
- Correlation
- Promotion
- Evidence (with identity-specific fields)
- Timeline
- Summary
- Store
- JWKS state functions
- Tenant state functions
- Auditor logic (mock data)

**Integration tests target: 16+**
- All 3 scenarios end-to-end
- All 3 audits end-to-end
- Reset → Simulate flow
- JWT signing and verification with `jose`
- Tenant isolation enforcement

**Total: 28+ tests**

---

## Evidence Bundle Schema (Identity-Specific)

```json
{
  "incident_id": "inc_001",
  "captured_at": "2026-04-06T08:00:00.000Z",
  "checksum": "sha256:abc123def456...",
  "scenario_id": "jwks-rotation-failure",
  "component_health": {
    "api": "operational",
    "auth": "down",
    "database": "operational"
  },
  "jwks_state": {
    "current_kid": "key_2026_002",
    "previous_kid": "key_2026_001",
    "rotation_age_seconds": 45,
    "validators_with_stale_cache": 7,
    "active_keys_count": 2
  },
  "auth_failure_metrics": {
    "failures_last_minute": 23,
    "unique_tenants_affected": 7,
    "failure_rate_pct": 92
  },
  "affected_tenants": ["tenant_0", "tenant_1", "tenant_3"],
  "exposed_keys": [],
  "cross_tenant_violations": [],
  "compliance_impact": "AUTH_OUTAGE",
  "recent_logs": [...],
  "triggering_events": [...],
  "recommended_action": "Force JWKS cache refresh on all validators within 60 seconds"
}
```

---

## Runbook Standard

Use the same format as repo-02. Each runbook MUST include:

### Required runbooks
1. `runbooks/jwks-rotation-failure.md` — JWKS cache refresh procedures
2. `runbooks/rls-bypass.md` — Security escalation flow with legal/compliance contacts
3. `runbooks/cross-tenant-exposure.md` — Compliance breach response (GDPR/SOC2)
4. `runbooks/general-auth-triage.md` — When you don't know which auth issue it is

#### Special: Security Runbooks
For security-related runbooks (RLS Bypass, Cross-Tenant), add a "Compliance Notification" section:
```markdown
## Compliance Notification
- [ ] Notify Legal team within 1 hour
- [ ] Notify CISO immediately
- [ ] Begin GDPR Article 33 timer (72 hours)
- [ ] Document affected user count for breach notification
```

---

## Public README Structure

Same structure as repo-02's README. Identity-specific sections:

```markdown
# Identity / JWKS / Entitlement Guardian

> When auth breaks at 2am, this is what tells you which keys rotated wrong.

## Overview
Identity systems are deceptively complex. Tokens, keys, caches, tenants, roles — when something breaks, support engineers face a maze of subsystems...

## The Startup Pain This Solves
- JWKS rotation failures locking out customers
- Cross-tenant data exposure from missing query filters
- Service role keys leaked in frontend bundles
- Hours of forensic work to figure out who saw what

## What This Repo Demonstrates
- Real-time JWKS rotation monitoring
- Tenant isolation auditing
- Entitlement drift detection
- Security-grade evidence capture
- Compliance-aware runbooks

## Architecture
[ASCII diagram showing api → jwks-server → intelligence-core → support-console]

## Auditor Tools
This repo includes 3 audit tools that can run independently:
- `npm run audit:jwks` — JWKS rotation health
- `npm run audit:tenants` — Tenant isolation
- `npm run audit:entitlements` — Permission consistency

## Built With
- Node.js
- jose (JWT/JWKS — industry standard)
- Concurrently
- Playwright
- Vanilla JS/HTML/CSS
```

---

## Acceptance Criteria

### Functional
- [ ] All 3 scenarios trigger via UI buttons
- [ ] All 3 audit tools work via CLI AND via UI buttons
- [ ] JWT signing and verification uses real `jose` library
- [ ] Multi-tenant data isolation works correctly
- [ ] Reset → Simulate flow works
- [ ] Evidence bundles contain identity-specific fields
- [ ] Runbooks include compliance notification sections for security incidents

### Quality
- [ ] 28+ tests passing
- [ ] No JavaScript console errors
- [ ] Cache-busting headers
- [ ] All endpoints return correct status codes
- [ ] Operator console matches repo-01 / SUP_incident-intelligence-fastpath's quality

### Portfolio
- [ ] README has all required sections
- [ ] Architecture diagram shows JWT flow
- [ ] At least 2 screenshots
- [ ] Built With lists `jose` library
- [ ] No "inspired by" credits
- [ ] Compliance language is accurate (GDPR, SOC2)

---

## Critical Warnings From repo-01 / SUP_incident-intelligence-fastpath Experience

### 1. Do NOT edit large inline HTML script blocks with partial edits
Rewrite `index.html` entirely when changes are needed.

### 2. Use file-backed runtime store from day 1
Never use in-memory shared state across processes.

### 3. Test the Reset → Simulate flow as P0
repo-01 / SUP_incident-intelligence-fastpath had a bug here. Test it explicitly.

### 4. Serve runbooks from the console server
Add `GET /runbooks/:name` route.

### 5. Cache-busting headers are mandatory
No-cache headers on `serveFile()`.

### 6. Use REAL crypto library (`jose`)
Do NOT implement JWT signing/verification from scratch. Use `jose`. This proves you know production tooling.

### 7. Tenant isolation is the hardest part
Test cross-tenant queries explicitly. Make sure the simulator actually returns wrong tenant's data when the bypass is triggered.

### 8. Compliance language must be accurate
Don't make up GDPR articles. Verify against the actual regulation text.

---

## Build Order (Recommended Sequence)

1. **Day 1: Foundation + JWT Setup**
   - Folder structure
   - `npm install` with `jose`
   - Build `runtime/store.js`
   - Test `jose` JWT signing/verification in isolation

2. **Day 2: Multi-Tenant App**
   - Build `app-under-test/api/server.js` with tenant routing
   - Build `app-under-test/auth/jwks-server.js`
   - Build `app-under-test/auth/token-issuer.js`
   - Test JWT issuing and validation

3. **Day 3: Tenant Isolation**
   - Build tenant store with simulated RLS
   - Test cross-tenant query enforcement
   - Add deliberate "broken" query for scenario 3

4. **Day 4: Intelligence Core**
   - Same as repo-01 / SUP_incident-intelligence-fastpath pattern with identity-specific fields

5. **Day 5: Scenarios + Auditors**
   - Build all 3 scenario inject scripts
   - Build all 3 auditor scripts
   - Test each independently

6. **Day 6: Support Console**
   - Backend with all endpoints
   - Frontend in ONE pass
   - Add auditor buttons in UI

7. **Day 7: Tests + Runbooks + README**
   - All tests passing
   - Runbooks with compliance sections
   - README with screenshots

---

## How to Verify Quality (Pre-Push Checklist)

```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Reset
npm run reset

# 3. Run all tests
npm test
npm run test:integration

# 4. Run audits independently
npm run audit:jwks
npm run audit:tenants
npm run audit:entitlements

# 5. Start system
npm run start:all

# 6. Manual UI verification:
# - Click "JWKS Rotation Failure" → P1 incident with auth=down
# - Click "RLS Bypass" → P1 security incident
# - Click "Cross-Tenant Exposure" → P1 compliance incident
# - Click "Run JWKS Audit" → audit results modal
# - Click "Reset Console" → clean state
# - Click any scenario again → new incident generates (CRITICAL TEST)
# - Click incident → detail view shows JWKS state, tenant info
```

---

## Public Presentation Rules

- Original work framing
- No "inspired by" credits
- Compliance language MUST be accurate (verify against real regulations)
- Frame as "demonstrates the ability to handle" not "I handled real breaches"
- Include disclaimer that scenarios are simulated, no real data is used

---

## Post-Build Deliverable (Screenshot Capture)

After this repo passes the acceptance criteria, do **not** create a landing page yet.
Landing pages are built in a separate phase after the app is verified real.

Before declaring the repo done, save these screenshots to `docs/SCREENSHOTS/`:

1. `01-main-view.png` — default operator console / empty state
2. `02-active-simulation.png` — after a simulation runs, with the incident detail view populated
3. `03-side-panel-state.png` — the panel showing the most important operational context (tenant impact, auth health, entitlement drift, or equivalent)

These screenshots are the raw material for the later landing-page phase.

## Success Criteria

Hiring manager opens GitHub repo:
1. README in 60 seconds → understands value
2. `npm install && npm run start:all` → works first try
3. Click button → real incident with security context
4. Inspect evidence bundle → believable JWKS/tenant state
5. Read runbook → professional compliance language
6. Decides to interview within 5 minutes

If any step fails, repo is not done.
