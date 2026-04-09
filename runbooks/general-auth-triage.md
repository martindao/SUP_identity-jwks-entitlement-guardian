# General Auth Triage

## When to Use This Runbook
Use this runbook when you're not sure which specific auth issue is occurring, or when multiple symptoms suggest different underlying causes.

## Common Auth Issues

### 1. Token Validation Failures
**Symptoms:**
- JWT signature invalid errors
- Token expired errors
- Audience mismatch

**Quick Check:**
```bash
# Decode JWT to inspect claims
curl -X GET http://localhost:3001/api/protected \
  -H "Authorization: Bearer <token>"
```

**Possible Causes:**
- JWKS cache stale (see jwks-rotation-failure.md)
- Clock skew between services
- Wrong audience configuration

### 2. JWKS Cache Issues
**Symptoms:**
- `kid not in cache` errors
- Sudden spike in auth failures
- Works after service restart

**Quick Check:**
```bash
# Check current JWKS
curl http://localhost:3002/.well-known/jwks.json | jq '.keys[].kid'

# Compare with validator cache
curl http://localhost:3001/admin/jwks/cache | jq '.cached_keys'
```

**Possible Causes:**
- Recent key rotation without cache refresh
- Cache TTL too long
- Network issues fetching JWKS

### 3. Key Rotation Problems
**Symptoms:**
- Some requests work, others fail
- Gradual increase in failures
- Failures correlate with deployment time

**Quick Check:**
```bash
# Check key rotation history
cat runtime/jwks-state.json | jq '.rotation_history'
```

**Possible Causes:**
- Incomplete key rotation
- Validators not refreshing cache
- Mixed key versions across services

### 4. Tenant Isolation Issues
**Symptoms:**
- Cross-tenant data in responses
- Users seeing wrong tenant's data
- Query warnings in logs

**Quick Check:**
```bash
# Check for cross-tenant violations
grep "cross_tenant" runtime/logs.ndjson | tail -20
```

**Possible Causes:**
- Query missing tenant_id filter (see cross-tenant-exposure.md)
- Exposed service role key (see rls-bypass.md)
- RLS policy misconfiguration

## Triage Decision Tree

```
START
│
├─ Are there JWT validation errors?
│  ├─ YES → Is "kid not in cache" present?
│  │  ├─ YES → JWKS Rotation Failure (runbook: jwks-rotation-failure.md)
│  │  └─ NO → Check token expiration and audience
│  └─ NO → Continue
│
├─ Is cross-tenant data visible?
│  ├─ YES → Is service_role key exposed?
│  │  ├─ YES → RLS Bypass (runbook: rls-bypass.md)
│  │  └─ NO → Cross-Tenant Exposure (runbook: cross-tenant-exposure.md)
│  └─ NO → Continue
│
├─ Are multiple services affected?
│  ├─ YES → Check component health
│  │  └─ Identify shared dependency (JWKS, DB, etc.)
│  └─ NO → Check service-specific configuration
│
└─ Still unclear?
   └─ Gather evidence and escalate
```

## Escalation Criteria

### Escalate to Security Team Immediately
- Service role key exposure suspected
- Cross-tenant data access confirmed
- Evidence of malicious activity
- Compliance breach indicators

### Escalate to Engineering Lead
- Multiple services affected
- Root cause unclear after initial triage
- Requires architecture-level fix
- Performance degradation suspected

### Escalate to On-Call Engineer
- Single service affected
- Clear remediation path exists
- Requires configuration change
- Needs restart or deployment

## Evidence Collection

Before escalating, collect:
```bash
# Current auth failure rate
curl http://localhost:3003/api/health

# Recent auth errors
grep "auth" runtime/logs.ndjson | grep "error" | tail -50

# JWKS state
cat runtime/jwks-state.json

# Tenant state
cat runtime/tenant-state.json

# Component health
cat runtime/component-health.json
```

## Quick Diagnostics

```bash
# Test JWKS endpoint
curl -I http://localhost:3002/.well-known/jwks.json

# Test API health
curl http://localhost:3001/health

# Test token issuance
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"test","user_id":"test"}'

# Check for exposed keys
grep -r "service_role" app-under-test/
```

## Prevention Checklist
- [ ] JWKS cache refresh on key rotation
- [ ] Tenant filter validation in queries
- [ ] Service role key exposure detection
- [ ] Auth failure rate monitoring
- [ ] Cross-tenant query detection
- [ ] Regular security audits
