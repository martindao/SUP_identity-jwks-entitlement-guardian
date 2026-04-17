# Learnings

## 2024-04-16: SAML Troubleshooting Doc + Sample Assertion

### Patterns Observed
- Support-facing docs should mirror existing runbook structure (see ``runbooks/jwks-rotation-failure.md``)
- Each failure mode needs: symptoms, diagnosis steps, common causes, remediation
- Okta-style attribute naming convention: ``okta.userName``, ``okta.groups``, ``okta.email``, etc.

### Conventions Established
- Demo/mock artifacts must have explicit disclaimer comments at the top
- SAML assertions use ``artifacts/samples/`` directory for mock proof
- Vendor flavor locked to Okta terminology only (no Entra/Azure AD references)

### File Locations
- ``docs/SAML_TROUBLESHOOTING.md`` - Support-facing SAML incident guide
- ``artifacts/samples/saml-assertion.xml`` - Mock SAML assertion for demo purposes

### Key Verification Points
- Doc must contain: ``audience``, ``signature``, ``attribute mapping`` keywords
- Artifact must contain: ``<saml:Assertion`` and ``DEMO/MOCK PROOF`` disclaimer
- No multi-vendor references (Entra, Azure AD forbidden)

---

## 2026-04-16: SCIM Provisioning Doc + Sample Payload

### Patterns Observed
- Support-facing SCIM docs follow same structure as SAML/JWKS docs: provision, deprovision, mismatch flows
- Each SCIM flow needs: HTTP request examples, common issues table, diagnosis checklist
- Okta-style group naming: ``Okta-Users``, ``Okta-Admins``, ``Okta-Sales`` (prefix convention)
- SCIM payloads require ``userName``, ``active``, ``groups`` fields for support triage

### Conventions Established
- SCIM artifacts use ``_comment`` field for simulation disclaimer (JSON-safe)
- Additional ``_simulation_metadata`` block for audit-friendly context
- Group objects include ``type`` field (``direct`` vs ``nested``)
- Enterprise extension schema for employee metadata

### File Locations
- ``docs/SCIM_PROVISIONING.md`` - Support-facing SCIM workflow guide
- ``artifacts/samples/scim-user.json`` - Mock SCIM user payload

### Key Verification Points
- Doc must contain: ``provision``, ``deprovision``, ``group`` or ``role sync mismatch``
- Payload must contain: ``userName``, ``active``, ``groups`` with Okta-style names
- Explicit ``_comment`` field stating ``DEMO/MOCK PROOF``
- No live HRIS or downstream SaaS synchronization claims

---

## 2026-04-17: Runtime Enterprise Identity State Scaffolding

### Patterns Observed
- File-backed state helpers follow existing JWKS getter/setter pattern
- Use ``readJSON()`` with fallback defaults for resilience
- Use ``writeJSON()`` for atomic file writes
- Constants for file paths at module top (lines 8-15)

### SAML State Fields (okta-style vendor)
- ``vendor_flavor: 'okta-style'`` - locked to single vendor
- ``last_assertion_review`` - timestamp for audit trail
- ``assertion_audience_status`` - validation status indicator
- ``signature_valid`` - boolean for signature check
- ``attribute_mapping_complete`` - boolean for mapping status
- ``mapping_failures`` - array for troubleshooting metadata
- ``last_metadata_refresh`` - timestamp for metadata sync

### SCIM State Fields (okta-style vendor)
- ``vendor_flavor: 'okta-style'`` - locked to single vendor
- ``last_provisioning_sync`` - timestamp for audit trail
- ``provision_status`` - provisioning health indicator
- ``deprovision_status`` - deprovisioning health indicator
- ``group_sync_status`` - group sync health indicator
- ``role_sync_status`` - role sync health indicator
- ``provisioning_drift`` - array for drift tracking
- ``last_sync_errors`` - array for error tracking

### Integration Points
- ``resetRuntime()`` must reset all state files with fresh defaults
- ``ensureRuntimeFiles()`` must initialize missing state files
- Export all new helpers in ``module.exports``

### File Locations
- ``runtime/store.js`` - Extended with SAML/SCIM state helpers
- ``runtime/saml-state.js`` - SAML state seed file
- ``runtime/scim-state.js`` - SCIM state seed file

### Key Verification Points
- ``getSAMLState()`` and ``getSCIMState()`` return objects with ``vendor_flavor: 'okta-style'``
- ``resetRuntime()`` recreates both state files with fresh timestamps
- No real vendor credentials or SDK initialization

---

## 2026-04-16: Incident Promotion Engine SAML/SCIM Classification

### Patterns Observed
- Scenario detection uses message content keyword matching (same pattern as JWKS/RLS/cross-tenant)
- Protocol field derived from scenario_id via helper function
- Vendor flavor only set for SAML/SCIM (null for JWKS incidents)
- Compliance labels follow existing pattern: AUTH_OUTAGE, DATA_BREACH_POTENTIAL, etc.

### Conventions Established
- SAML scenario_id: ``saml-config-drift``
- SCIM scenario_id: ``scim-provisioning-drift``
- SAML compliance label: ``AUTH_CONFIG_DRIFT``
- SCIM compliance label: ``PROVISIONING_DRIFT``
- Protocol values: ``JWKS``, ``SAML``, ``SCIM`` (null for unknown)
- Vendor flavor: ``okta-style`` for SAML/SCIM, null for JWKS

### File Locations
- ``intelligence-core/promotion/engine.js`` - Extended with SAML/SCIM detection and metadata
- ``tests/fixtures/saml-scenario-fixture.js`` - Node fixture for verification

### Key Verification Points
- SAML incidents must have ``protocol: "SAML"`` and ``vendor_flavor: "okta-style"``
- SCIM incidents must have ``protocol: "SCIM"`` and ``vendor_flavor: "okta-style"``
- JWKS incidents must have ``protocol: "JWKS"`` and ``vendor_flavor: null``
- Existing JWKS/RLS/cross-tenant incidents unchanged (verified via fixture tests)
- No multi-vendor branching (Okta-style only)

### Integration Points
- ``detectScenario()`` - Extended to detect SAML/SCIM keywords before JWKS check
- ``determineProtocol()`` - New helper to derive protocol from scenario_id
- ``determineVendorFlavor()`` - New helper to set vendor_flavor for SAML/SCIM
- ``determineComplianceImpact()`` - Extended with AUTH_CONFIG_DRIFT and PROVISIONING_DRIFT
- ``generateTitle()`` - Extended with SAML/SCIM-specific titles
- ``getRunbookForScenario()`` - Extended with SAML/SCIM runbook paths

---

## 2026-04-16: Evidence Bundle Schema Extension for Enterprise Identity

### Patterns Observed
- Evidence capture follows existing JWKS pattern: get state from store, build evidence object, calculate checksum
- All evidence bundles must include both `saml_state` and `scim_state` blocks (even for JWKS incidents)
- Checksum calculation must cover all enterprise identity fields for integrity verification
- Summary generation uses scenario_id to determine which evidence lines to display

### Conventions Established
- Evidence bundle always includes `saml_state` and `scim_state` blocks
- `vendor_flavor` field at evidence root level mirrors incident's vendor_flavor
- Checksum serialization includes: `saml_state`, `scim_state`, `vendor_flavor` in addition to existing fields
- Summary "What Happened" section includes vendor flavor and specific failure counts
- Summary "Evidence Captured" section shows protocol-specific fields

### SAML Evidence Block Fields
- `vendor_flavor` - Vendor identifier (e.g., "okta-style")
- `last_assertion_review` - Timestamp of last assertion review
- `assertion_audience_status` - Audience validation status ("valid" | "invalid")
- `signature_valid` - Boolean for signature validation
- `attribute_mapping_complete` - Boolean for mapping status
- `mapping_failures` - Array of {attribute, error} objects
- `last_metadata_refresh` - Timestamp of metadata sync

### SCIM Evidence Block Fields
- `vendor_flavor` - Vendor identifier (e.g., "okta-style")
- `last_provisioning_sync` - Timestamp of last sync
- `provision_status` - Provisioning health ("healthy" | "degraded" | "failed")
- `deprovision_status` - Deprovisioning health
- `group_sync_status` - Group sync health
- `role_sync_status` - Role sync health
- `provisioning_drift` - Array of {user, expected_groups, actual_groups} objects
- `last_sync_errors` - Array of {timestamp, error} objects

### File Locations
- ``intelligence-core/evidence/snapshot.js`` - Extended with SAML/SCIM state capture
- ``intelligence-core/summaries/summary.js`` - Extended with SAML/SCIM summary generation
- ``docs/ARTIFACT_SCHEMA.md`` - Updated with new evidence block documentation
- ``tests/fixtures/evidence-bundle-fixture.js`` - Node fixture for evidence verification

### Key Verification Points
- Evidence bundle must have `saml_state` block with all required fields
- Evidence bundle must have `scim_state` block with all required fields
- Evidence bundle must have `vendor_flavor` field (null for JWKS, "okta-style" for SAML/SCIM)
- Checksum must start with "sha256:" and cover enterprise identity fields
- Summary must mention vendor flavor and specific failure counts for SAML/SCIM incidents
- JWKS evidence capture unchanged (verified via fixture tests)

### Integration Points
- ``captureEvidence()`` - Extended to call ``getSAMLState()`` and ``getSCIMState()``
- ``generateChecksum()`` - Extended to include `saml_state`, `scim_state`, `vendor_flavor`
- ``generateWhatHappened()`` - Extended with SAML/SCIM scenario descriptions
- ``generateEvidenceLines()`` - Extended with SAML/SCIM evidence display

---

## 2026-04-17: SCIM Audit Workflow Implementation

### Patterns Observed
- Auditor scripts follow consistent structure: imports, AUDIT_DIR constant, main function, report generation, console output, module export
- Each auditor uses `store.getSCIMState()` (or equivalent) to fetch runtime state
- Checks array contains objects with `name`, `status`, and `detail` fields
- Report includes `audit_type`, `audited_at`, `checks`, `summary`, plus domain-specific metadata
- Exit code 1 on any failed checks, exit 0 on all passed

### Conventions Established
- SCIM audit checks: provisioning_status_healthy, deprovision_handling_healthy, group_sync_no_drift, role_sync_no_drift
- Group sync drift detection compares `expected_groups` vs `actual_groups` arrays (sorted JSON comparison)
- Report includes vendor_flavor and all SCIM status fields for audit trail
- Dated artifact naming: `scim-audit-YYYY-MM-DD.json`

### File Locations
- ``auditors/scim-audit.js`` - SCIM provisioning drift auditor
- ``artifacts/audits/scim-audit-*.json`` - Generated audit artifacts

### Key Verification Points
- ``npm run audit:scim`` exits 0 when all checks pass
- Audit artifact contains checks for: provision, deprovision, group sync, role sync
- Artifact saved to ``artifacts/audits/`` with dated naming
- No real outbound provisioning requests (uses store state only)

### Integration Points
- ``store.setSCIMState()`` - Updates SCIM state with failure indicators
- ``store.logEvent()`` - Logs SCIM-specific events with correlation_key
- ``store.updateComponentHealth()`` - Sets scim-provisioning to degraded
- ``package.json`` - ``scenario:scim`` script already registered

---

## 2026-04-17: Support Console SAML/SCIM Controls + Incident Metadata Badges

### Patterns Observed
- UI buttons follow existing simulation-btn class pattern with data attributes for QA selectors
- Incident card rendering uses template literals with conditional badge rendering
- Protocol badge always shown (defaults to JWKS), vendor badge only for SAML/SCIM incidents
- Backend routes already implemented: `/api/simulate/saml`, `/api/simulate/scim`, `/api/audit/saml`, `/api/audit/scim`

### Conventions Established
- Simulation buttons: `data-simulate="saml"` and `data-simulate="scim"` attributes
- Audit buttons: `data-audit="saml"` and `data-audit="scim"` attributes
- Protocol badge: `<span class="badge badge-protocol" data-protocol="SAML|SCIM|JWKS">`
- Vendor badge: `<span class="badge badge-vendor" data-vendor="okta-style">` (only for SAML/SCIM)
- Button styling: `btn btn-warning` for SAML/SCIM simulation buttons (distinct from existing buttons)

### File Locations
- ``support-console/ui/index.html`` - Extended with SAML/SCIM controls and incident badges
- ``support-console/server.js`` - Backend routes already implemented (lines 138-158, 226-266)

### Key Verification Points
- Playwright can find `button[data-simulate="saml"]` and `button[data-simulate="scim"]`
- Playwright can find `button[data-audit="saml"]` and `button[data-audit="scim"]`
- Incident cards render protocol badge with `data-protocol` attribute
- Incident cards render vendor badge with `data-vendor` attribute for SAML/SCIM incidents
- JWKS incidents show `data-protocol="JWKS"` with no vendor badge

### Integration Points
- ``renderIncidents()`` - Extended to extract protocol and vendor_flavor from incident objects
- ``simulate()`` function - Already handles 'saml' and 'scim' types via existing API routes
- ``runAudit()`` function - Already handles 'saml' and 'scim' types via existing API routes


---

## 2026-04-17: SAML Audit Workflow Implementation

### Patterns Observed
- SAML auditor mirrors JWKS/SCIM auditor structure exactly
- Uses `store.getSAMLState()` to fetch runtime state
- Checks array follows same `{name, status, detail}` pattern
- Report includes `audit_type`, `audited_at`, `vendor_flavor`, `checks`, `summary`, and domain state

### Conventions Established
- SAML audit checks: metadata_freshness (30-day threshold), signature_trust_valid, audience_validation, attribute_mapping_complete
- Metadata freshness calculated as days since `last_metadata_refresh`
- Report includes full `saml_state` block for audit trail
- Dated artifact naming: `saml-audit-YYYY-MM-DD.json`

### File Locations
- ``auditors/saml-audit.js`` - SAML configuration health auditor
- ``artifacts/audits/saml-audit-*.json`` - Generated audit artifacts

### Key Verification Points
- ``npm run audit:saml`` exits 0 when all checks pass
- Audit artifact contains checks for: audience, cert/signature, attribute mapping
- Artifact saved to ``artifacts/audits/`` with dated naming
- No external IdP calls (uses store state only)

### Integration Points
- ``store.getSAMLState()`` - Fetches SAML runtime state
- ``package.json`` - ``audit:saml`` script already registered

---

## 2026-04-17: SCIM Scenario Injector + Runbook Implementation

### Patterns Observed
- SCIM injector follows same structure as JWKS injector: setScenarioMode, getSCIMState, update state, log events, update component health
- Events use consistent correlation_key pattern: `scim-provisioning-drift`
- Each event includes SCIM-specific fields: user_email, expected_groups, actual_groups, drift_type, operation
- Injector emits events for all three failure modes: provision failure, deprovision issue, group/role sync mismatch

### Conventions Established
- SCIM scenario_id: `scim-provisioning-drift` (matches promotion engine detection)
- Correlation key: `scim-provisioning-drift` (same as scenario_id for consistency)
- SCIM events include: provision request failure (401), deprovision state issue, group sync mismatch, role sync mismatch
- Runbook focuses on support-facing remediation, not identity architecture

### SCIM Injector Events
1. **Provision failure** - 401 Unauthorized, token expired, POST /scim/v2/Users
2. **Deprovision issue** - Terminated user still active, incomplete deprovision
3. **Group sync mismatch** - User missing Okta-Admins group membership
4. **Role sync mismatch** - User has unauthorized Okta-Admins role
5. **Sync summary** - Aggregate drift statistics

### File Locations
- ``scenarios/scim-failure/inject.js`` - SCIM scenario injector
- ``runbooks/scim-provisioning-drift.md`` - SCIM provisioning support runbook

### Key Verification Points
- ``npm run scenario:scim`` exits 0
- Incident has ``protocol: "SCIM"`` and ``vendor_flavor: "okta-style"``
- Evidence contains provision_status, deprovision_status, group_sync_status, provisioning_drift, last_sync_errors
- Runbook contains provision, deprovision, group sync, role sync sections

### Integration Points
- ``store.setSCIMState()`` - Updates SCIM state with failure indicators
- ``store.logEvent()`` - Logs SCIM-specific events with correlation_key
- ``store.updateComponentHealth()`` - Sets scim-provisioning to degraded
- ``package.json`` - ``scenario:scim`` script already registered
 
 