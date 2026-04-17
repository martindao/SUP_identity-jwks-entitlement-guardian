# UI Spec — Identity / JWKS / Entitlement Guardian

This repo must visually match the quality bar established by repo-01 after its UI upgrade, adapted for identity/auth incidents.

## Goal

The support console should feel like a real operator workspace for auth incidents. The reviewer must instantly see which keys rotated, which tenants are affected, and whether this is a security incident.

## Layout

Use the same 3-column operator layout:
- **Left rail:** incident queue
- **Center pane:** incident detail with identity-specific evidence
- **Right rail:** live simulation + audits + component health + trust markers

## Required Panels

### Left Rail — Incident Queue

Each incident card must show:
- incident ID
- title
- severity badge (P1 for security/auth)
- probable origin
- confidence percentage
- affected tenant count
- compliance impact label
- opened time

**Visual hierarchy:**
- Security incidents (RLS bypass, cross-tenant) at top with red border
- Auth incidents (JWKS rotation) with orange border
- Affected tenant count prominent
- Compliance impact badge visible

### Center Pane — Incident Detail

Must include inline sections:
1. **Header / metadata grid** — ID, severity, status, compliance impact
2. **Overview** — what happened in plain language
3. **Timeline** — key rotation → failures → detection
4. **Evidence Snapshot** — identity-specific fields:
   - Current `kid` vs cached `kid`
   - Stale validator count
   - Affected tenant list
   - Exposed keys (if any)
   - Cross-tenant violations (if any)
5. **Runbook Preview** — with compliance notification section for security incidents
6. **Raw Artifact Links** — links to JSON artifacts

### Right Rail — Context

Must include:
- **Live Simulation buttons:**
  - JWKS Rotation Failure
  - RLS Bypass
  - Cross-Tenant Exposure
  - Reset Console
- **Auditor buttons:**
  - Run JWKS Audit
  - Run Tenant Audit
  - Run Entitlement Audit
- **Component Health** — auth, api, jwks-server, database
- **Trust Markers** when incident selected:
  - Evidence checksum
  - Timeline completeness
  - Runbook linked

## Identity-Specific Evidence Preview

For JWKS rotation incidents, must show:
```
JWKS State:
  Current key: key_2026_002
  Previous key: key_2026_001
  Rotation age: 45 seconds
  Stale validators: 7
  
Auth Failures:
  Failure rate: 92%
  Affected tenants: 7
  Error type: jwt_signature_invalid
```

For RLS bypass incidents, must show:
```
Exposed Key:
  Type: service_role
  Location: frontend_bundle.js
  
Cross-Tenant Queries:
  Count: 5
  Victim tenants: 5
  
Compliance Impact: DATA_BREACH_POTENTIAL
```

For cross-tenant exposure, must show:
```
Vulnerable Query: list_customer_orders
Missing Filter: tenant_id

Data Leaked:
tenant_0 -> visible to tenant_1
tenant_2 -> visible to tenant_5

Compliance Impact: GDPR_ARTICLE_32_BREACH
```

## Enterprise Identity Evidence Preview

### SAML Evidence Section

For SAML configuration drift incidents, must show:
```
SAML Evidence:
Audience Status: valid
Signature Valid: Yes
Attribute Mapping: Complete
Last Metadata Refresh: 4/16/2026, 7:00:00 AM

Mapping Failures: (if any)
okta.groups -> Missing required attribute
okta.email -> Invalid format
```

**Deterministic selector:** `[data-section="saml-evidence"]`

**Required fields:**
- `assertion_audience_status` — Audience validation status (valid/invalid)
- `signature_valid` — Boolean for signature validation
- `attribute_mapping_complete` — Boolean for mapping status
- `mapping_failures` — Array of {attribute, error} objects (shown only if non-empty)
- `last_metadata_refresh` — Timestamp of last metadata sync

### SCIM Evidence Section

For SCIM provisioning drift incidents, must show:
```
SCIM Evidence:
Provision Status: healthy
Deprovision Status: healthy
Group Sync Status: degraded
Role Sync Status: healthy

Provisioning Drift: (if any)
user@example.com -> Expected: Okta-Admins, Okta-Users | Actual: Okta-Users
```

**Deterministic selector:** `[data-section="scim-evidence"]`

**Required fields:**
- `provision_status` — Provisioning health (healthy/degraded/failed)
- `deprovision_status` — Deprovisioning health
- `group_sync_status` — Group sync health
- `role_sync_status` — Role sync health
- `provisioning_drift` — Array of {user, expected_groups, actual_groups} objects (shown only if non-empty)

### Protocol and Vendor Display

For enterprise identity incidents (SAML/SCIM), the detail header must show:
- **Protocol label** — Displayed as `Protocol: SAML` or `Protocol: SCIM`
- **Vendor flavor** — Displayed as `Vendor: okta-style` (only for SAML/SCIM incidents)

Example header for SAML incident:
```
Overview
SAML assertion audience mismatch detected
Protocol: SAML | Vendor: okta-style | Affected: 3 tenants | Compliance: AUTH_CONFIG_DRIFT
```

### Incident Card Badges

For enterprise identity incidents, the incident card must show:
- Protocol badge with `data-protocol` attribute
- Vendor badge with `data-vendor` attribute (only if vendor_flavor is set)

Example:
```html
<span class="badge badge-protocol" data-protocol="SAML">SAML</span>
<span class="badge badge-vendor" data-vendor="okta-style">okta-style</span>
```

## Live Simulation Requirements

Buttons required:
- JWKS Rotation Failure
- RLS Bypass
- Cross-Tenant Exposure
- SAML Config Drift
- SCIM Provisioning Drift
- Reset Console

Buttons must:
- be visible even when there are zero incidents
- trigger scenarios without CLI use
- update the queue/detail panes automatically
- show loading state during execution

## Auditor Panel

Must include:
- Run JWKS Audit button
- Run Tenant Audit button
- Run Entitlement Audit button
- Audit SAML button
- Audit SCIM button

After clicking audit:
- Modal shows pass/fail per check
- Failed checks highlighted
- Link to full audit report

## Visual Style

Copy repo-01's final console style:
- dark operator console
- compact cards
- strong severity emphasis
- dense but readable detail pane
- muted borders and professional spacing

**Identity-specific colors:**
- Red: security incidents (RLS bypass, cross-tenant)
- Orange: auth incidents (JWKS rotation)
- Yellow: warnings (stale cache, suspect keys)
- Green: operational, audits passed

## Hard Rules

1. Do not ship a UI that requires opening raw JSON first to understand the incident.

2. The dashboard must show **affected tenants** prominently. If it only shows component health, it failed the repo goal.

3. Security incidents must have visible compliance impact labels.

4. After running a simulation, the UI must auto-refresh to show new incidents.

5. The auditor buttons must be prominent. Proactive auditing is a key feature.

## Required Interactions

1. **Click incident card** → center pane shows incident detail
2. **Click "Run JWKS Audit"** → audit modal shows pass/fail
3. **Click "Run Tenant Audit"** → tenant isolation check results
4. **Click "Run Entitlement Audit"** → permission drift check results
5. **Click "Reset Console"** → all incidents cleared
6. **After simulation** → new incident appears with identity-specific evidence

## Security Incident Handling

For RLS bypass and cross-tenant incidents:
- Compliance impact badge must be red
- Runbook preview must show compliance notification section
- Affected tenant list must be visible
- Recommended action must include security escalation steps

## Error States

- If audit fails: show error toast, do not crash UI
- If no incidents: show empty state with "Run a simulation to see incidents" message
- If JWKS server unreachable: show warning in health panel
