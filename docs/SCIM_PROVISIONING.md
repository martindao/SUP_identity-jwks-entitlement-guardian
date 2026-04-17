# SCIM Provisioning Support Workflow

> **SIMULATION NOTICE:** This document describes support-facing incident handling for SCIM provisioning issues. It is simulated support evidence for portfolio demonstration, not a live SCIM server or identity platform implementation.

## Overview

System for Cross-domain Identity Management (SCIM) automates user provisioning and deprovisioning between identity providers (IdP) and downstream applications. When SCIM sync fails, support engineers face user access issues that require rapid diagnosis.

This document covers three common SCIM support scenarios:
1. **Provisioning failures** — Users not created in downstream systems
2. **Deprovisioning failures** — Terminated users retaining access
3. **Group/role sync mismatches** — Incorrect permissions assigned

---

## 1. Provisioning Flow

### What a Provision Request Looks Like

When an identity provider creates a user, it sends a SCIM `POST` request to the downstream application:

```http
POST /scim/v2/Users HTTP/1.1
Authorization: Bearer <service-account-token>
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "jsmith@example.com",
  "name": {
    "givenName": "John",
    "familyName": "Smith",
    "formatted": "John Smith"
  },
  "emails": [
    {
      "value": "jsmith@example.com",
      "type": "work",
      "primary": true
    }
  ],
  "active": true,
  "groups": [
    { "value": "Okta-Users", "display": "Okta-Users" },
    { "value": "Okta-Sales", "display": "Okta-Sales" }
  ]
}
```

### Common Provisioning Issues

| Issue | Symptoms | Diagnosis Steps |
|-------|----------|-----------------|
| **Token expired** | 401 Unauthorized in sync logs | Check service account token validity in IdP |
| **Duplicate user** | 409 Conflict, user exists with different externalId | Search by email, resolve duplicate |
| **Missing required field** | 400 Bad Request with schema error | Validate payload against SCIM schema |
| **Group not found** | User created but not added to group | Verify group exists in downstream app |
| **Rate limiting** | 429 Too Many Requests | Check sync batch size, implement backoff |

### Support Triage

1. **Check sync logs** — Look for HTTP error codes in IdP provisioning logs
2. **Verify user state** — Compare IdP user status with downstream app
3. **Validate mapping** — Ensure attribute mappings are correct
4. **Test connectivity** — Confirm SCIM endpoint is reachable

---

## 2. Deprovisioning Flow

### What a Deprovision Action Looks Like

When a user is terminated or deactivated in the identity provider, SCIM sends either:

**Option A: Soft delete (deactivate)**
```http
PATCH /scim/v2/Users/{userId} HTTP/1.1
Content-Type: application/scim+json

{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    {
      "op": "replace",
      "path": "active",
      "value": false
    }
  ]
}
```

**Option B: Hard delete (remove)**
```http
DELETE /scim/v2/Users/{userId} HTTP/1.1
```

### Common Deprovisioning Issues

| Issue | Symptoms | Diagnosis Steps |
|-------|----------|-----------------|
| **User remains active** | Terminated employee still has access | Check if deprovision triggered in IdP |
| **Delete failed silently** | No error, user persists | Verify DELETE returned 204, check audit logs |
| **Orphaned sessions** | User deactivated but sessions valid | Implement session revocation on deprovision |
| **Group membership retained** | User inactive but still in groups | Check if group removal is part of deprovision flow |
| **Downstream app ignores active flag** | User marked inactive but can still login | App may not check active status on auth |

### Support Triage

1. **Verify termination status** — Confirm user is deactivated in HRIS/IdP
2. **Check sync timestamp** — When did last SCIM sync occur?
3. **Force sync** — Trigger manual provisioning sync if needed
4. **Audit access** — Document any access after termination for compliance

---

## 3. Group/Role Sync Mismatch

### What a Mismatch Looks Like

A group/role sync mismatch occurs when the user's group memberships in the identity provider do not match their permissions in the downstream application.

**Example scenario:**
- IdP shows user in `Okta-Admins` group
- Downstream app shows user with `Viewer` role (not `Admin`)
- User cannot perform admin actions

### Common Causes

| Cause | Symptoms | Diagnosis Steps |
|-------|----------|-----------------|
| **Group mapping missing** | User in IdP group but no corresponding app role | Verify group-to-role mapping configuration |
| **Sync order issue** | User created before group assignment | Re-sync user after group assignment |
| **Group name mismatch** | `Okta-Admins` vs `Admins` naming difference | Check exact group name in mapping |
| **Circular group nesting** | Nested groups not expanded | Verify IdP supports nested group sync |
| **Partial sync failure** | Some groups synced, others failed | Check sync logs for specific group errors |

### Diagnosis Checklist

1. **Compare memberships**
   - IdP groups: `Okta-Admins`, `Okta-Users`, `Okta-Sales`
   - App roles: `Viewer`, `User` (missing Admin)

2. **Check sync logs**
   - Look for group-specific errors
   - Note timestamp of last successful group sync

3. **Verify mapping table**
   ```
   Okta-Admins  → Admin role
   Okta-Users   → User role
   Okta-Sales   → Sales role
   ```

4. **Test with known user**
   - Add test user to group
   - Verify role assignment appears
   - Remove and verify role removal

---

## Remediation Framing for Support Engineers

### Priority Classification

| Priority | Scenario | Response Time |
|----------|----------|---------------|
| **P1** | Terminated user retains access (security) | Immediate |
| **P1** | Admin access not granted to authorized user | < 1 hour |
| **P2** | New hire cannot access required systems | < 4 hours |
| **P3** | Group membership discrepancy (non-critical) | < 24 hours |

### Escalation Criteria

Escalate to identity engineering when:
- SCIM endpoint returns 5xx errors consistently
- Token refresh fails repeatedly
- Sync latency exceeds 4 hours
- Multiple users affected by same mapping issue

### Evidence to Capture

For audit and compliance purposes, document:
1. **User identity** — externalId, userName, email
2. **Expected state** — What groups/roles should user have
3. **Actual state** — What groups/roles user has
4. **Sync logs** — Timestamps, error codes, affected operations
5. **Remediation steps** — Actions taken to resolve

---

## Sample Artifact Reference

For a complete SCIM user payload example, see:
- `artifacts/samples/scim-user.json` — Mock SCIM user with Okta-style groups

---

## Compliance Considerations

- **GDPR Article 32** — Ensure timely deprovisioning to prevent unauthorized access
- **SOC 2** — Document provisioning/deprovisioning for access control audits
- **SOX** — Maintain evidence of role changes for financial system access

---

## Related Documentation

- [Artifact Schema](./ARTIFACT_SCHEMA.md) — Audit artifact format reference
- [API Contract](./API_CONTRACT.md) — SCIM endpoint specifications
