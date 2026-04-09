# Anti-Patterns — Identity / JWKS / Entitlement Guardian

Do NOT let an AI drift into these mistakes.

## 1. Security Theater

Bad:
- scary words, no evidence
- fake breach language without concrete state
- "CRITICAL SECURITY INCIDENT" with no specifics

Good:
- exact key IDs (key_2026_001 vs key_2026_002)
- exact tenant mappings (tenant_0 -> tenant_1)
- exact affected request counts
- specific error types (jwt_signature_invalid)

## 2. Fake JWT Logic

Bad:
- hand-rolled JWT signing/verification
- custom crypto implementation
- "I implemented JWT from scratch"

Good:
- use `jose` library (industry standard)
- real HMAC-SHA256 signatures
- proper key rotation with grace period

## 3. Missing Audit Layer

Bad:
- incidents only, no proactive checks
- no way to verify system health
- reactive only

Good:
- auditor scripts that produce reports
- JWKS rotation health checks
- Tenant isolation checks
- Entitlement drift checks

## 4. Flat Generic Dashboard

Bad:
- just red/green widgets
- no tenant information
- no compliance labels
- looks like every other monitoring tool

Good:
- support context + security evidence
- affected tenant list visible
- compliance impact labels
- runbooks with escalation sections
- trust markers

## 5. Compliance Overclaiming

Bad:
- pretending a legal conclusion was reached automatically
- "GDPR VIOLATION CONFIRMED"
- making up regulation articles

Good:
- say "potential compliance impact"
- use accurate labels (AUTH_OUTAGE, DATA_BREACH_POTENTIAL)
- reference actual regulation concepts correctly
- let humans make legal conclusions

## 6. No Tenant Visibility

Bad:
- incidents don't show affected tenants
- no tenant count
- no tenant-specific evidence

Good:
- affected tenant list in evidence
- tenant count in incident card
- tenant-specific failure metrics

## 7. Missing Key Information

Bad:
- "key rotation failed"
- no key IDs shown
- no cache state information

Good:
- current_kid: key_2026_002
- previous_kid: key_2026_001
- validators_with_stale_cache: 7
- rotation_age_seconds: 45

## 8. No Cross-Tenant Evidence

Bad:
- "cross-tenant exposure detected"
- no specific tenant mappings
- no query information

Good:
- vulnerable_query: list_customer_orders
- missing_filter: tenant_id
- data_leaked_between_tenants: [tenant_0->tenant_1]
- affected_request_count: 8

## 9. Over-Engineering

Bad:
- real OAuth provider integration
- production identity provider
- complex IAM platform

Good:
- lightweight JWKS simulation
- file-backed state (no database)
- believable auth failures without infrastructure

## 10. No Runbook Escalation

Bad:
- generic runbooks
- no security escalation section
- no compliance notification steps

Good:
- security runbooks have escalation criteria
- compliance notification checklist
- legal/CISO contact references
- GDPR timer reminders

## 11. Missing Evidence Checksum

Bad:
- evidence bundle without checksum
- no way to verify evidence integrity

Good:
- SHA-256 checksum in evidence bundle
- trust markers showing evidence verified
- checksum visible in UI

## 12. Generic README

Bad:
- tutorial tone
- vague claims about "auth security"
- no specific scenarios

Good:
- support-first operational framing
- concrete scenarios (JWKS, RLS, cross-tenant)
- clear explanation of tenant isolation
- accurate compliance language
