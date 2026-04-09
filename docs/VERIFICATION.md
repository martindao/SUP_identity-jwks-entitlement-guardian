# Verification — Identity / JWKS / Entitlement Guardian

This file is the final gate before pushing the repo publicly.

## 1. Install and Start

```bash
npm install
npm run reset
npm run start:all
```

This should start:
- API server on port 3001
- JWKS server on port 3002
- Intelligence core (background)
- Support console on port 3003

## 2. Unit Tests

```bash
npm test
```

Target: 12+ unit tests passing.

Tests should cover:
- Correlation logic
- Promotion logic
- Evidence snapshot generation
- Timeline generation
- Summary generation
- JWKS state functions
- Tenant state functions
- Auditor logic (mock data)

## 3. Integration Tests

```bash
npm run test:integration
```

Target: 16+ integration tests passing.

Tests should cover:
- All 3 scenarios end-to-end
- All 3 audits end-to-end
- Reset → Simulate flow
- JWT signing and verification with `jose`
- Tenant isolation enforcement

## 4. Manual UI Verification

Open `http://localhost:3003`

### Scenario A — JWKS Rotation Failure

1. Click `JWKS Rotation Failure`
2. Confirm at least 1 incident appears
3. Select the incident
4. Confirm center pane shows:
   - Current `kid` and previous `kid`
   - Stale validator count
   - Affected tenant list
   - Auth failure metrics
5. Confirm component health shows auth degraded
6. Confirm compliance impact shows "AUTH_OUTAGE"

### Scenario B — RLS Bypass

1. Click `Reset Console`
2. Click `RLS Bypass`
3. Confirm incident severity is P1
4. Select the incident
5. Confirm evidence shows:
   - Exposed key type: service_role
   - Exposed location: frontend_bundle.js
   - Cross-tenant query count
   - Affected victim tenants
6. Confirm compliance impact shows "DATA_BREACH_POTENTIAL"
7. Confirm runbook preview includes compliance notification section

### Scenario C — Cross-Tenant Exposure

1. Click `Reset Console`
2. Click `Cross-Tenant Exposure`
3. Confirm incident severity is P1
4. Select the incident
5. Confirm evidence shows:
   - Vulnerable query name
   - Missing filter: tenant_id
   - Data leaked between tenants
6. Confirm compliance impact shows "GDPR_ARTICLE_32_BREACH"
7. Confirm recommended action includes legal/compliance notification

### Scenario D — Auditor Verification

1. Click `Reset Console`
2. Run JWKS Rotation Failure simulation
3. Click `Run JWKS Audit`
4. Confirm audit modal shows:
   - Pass/fail per check
   - Failed check: "validators_using_current_kid"
   - Stale validator count
5. Click `Run Tenant Audit`
6. Confirm audit results shown
7. Click `Run Entitlement Audit`
8. Confirm audit results shown

## 5. Critical Bug Check

**Reset → Simulate flow**

This is a mandatory check:
1. Click `Reset Console`
2. Confirm queue is empty
3. Confirm all artifacts cleared
4. Click any simulate button
5. Confirm a NEW incident appears
6. Click the incident
7. Confirm NEW evidence is shown

If this fails, the repo is not ready.

## 6. JWT Verification

Test JWT signing and verification:
1. Start the system
2. Use `jose` library to create a test token
3. Verify token validates correctly
4. Rotate the key
5. Verify old tokens fail validation
6. Verify new tokens pass validation

```bash
# Manual JWT test
node -e "
const jose = require('jose');
// Test signing and verification
"
```

## 7. Tenant Isolation Check

Test tenant isolation:
1. Create tokens for different tenants
2. Query data with tenant A token
3. Verify tenant B data is not visible
4. Run cross-tenant simulation
5. Verify data leak is detected

## 8. Browser Console

Open devtools and confirm:
- no uncaught JS errors
- no duplicate declaration errors
- no 404s for runbooks or artifacts
- API calls return expected JSON structure

## 9. README Review

Read README from top to bottom as if you are a hiring manager.

Ask:
- Can I understand what this repo solves in 60 seconds?
- Is the identity/auth challenge explained clearly?
- Do the commands actually work?
- Is the compliance language accurate?

If any answer is no, fix it first.

## 10. Audit Report Quality

Open generated audit reports and verify:
- Pass/fail summary
- Individual check results
- Failed checks have specific details
- JWKS audit shows key information
- Tenant audit shows query information
- Entitlement audit shows role information

## 11. Compliance Language Check

Verify compliance language is accurate:
- "GDPR Article 32" is used correctly
- "DATA_BREACH_POTENTIAL" is appropriate
- "AUTH_OUTAGE" is appropriate
- No overclaiming about legal conclusions

## 12. Runbook Verification

Open each runbook and verify:
- JWKS rotation runbook has cache refresh steps
- RLS bypass runbook has security escalation section
- Cross-tenant runbook has compliance notification section
- All runbooks have clear action steps
