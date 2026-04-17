# SAML Configuration Drift

## Overview
SAML authentication is failing due to configuration drift between the Identity Provider (Okta) and the Service Provider. Multiple failure modes are present: audience mismatch, stale certificate/signature validation, and attribute mapping failures.

## Detection
- SAML auth failure rate spike (> 70% failures)
- `Audience restriction validation failed` error messages
- `Signature validation failed` or `Certificate expired` errors
- `Required attribute not found` or attribute mapping errors
- Users see "Authentication failed" after IdP redirect

## Immediate Actions
1. **Identify the failure mode(s)** - Check which of the three are occurring:
   - Audience mismatch
   - Signature/certificate failure
   - Attribute mapping failure
2. **Gather SAML assertion** - Decode the base64 SAML response for inspection
3. **Check Okta application settings** - Verify audience URI and attribute statements
4. **Verify certificate status** - Check if IdP certificate was recently rotated

## Investigation Steps

### 1. Audience Mismatch
1. Extract audience from SAML assertion:
   ```xml
   <saml:AudienceRestriction>
     <saml:Audience>https://wrong-sp.example.com</saml:Audience>
   </saml:AudienceRestriction>
   ```
2. Compare against SP configuration:
   - Expected: `https://app.example.com/saml/acs`
   - Check Okta app "Single Sign On URL" and "Audience URI"
3. Common causes:
   - SP metadata regenerated with different entity ID
   - Okta app cloned without updating audience
   - Environment mismatch (prod vs. staging)

### 2. Signature/Certificate Failure
1. Check certificate expiration:
   ```bash
   openssl x509 -in idp-cert.pem -text -noout | grep -A 2 "Validity"
   ```
2. Verify certificate matches IdP's current certificate
3. Check signature algorithm compatibility:
   - Okta typically uses `rsa-sha256`
   - Ensure SP supports the algorithm
4. Common causes:
   - IdP rotated signing certificate, SP not updated
   - SP has hardcoded certificate instead of dynamic metadata refresh
   - Clock skew causing validity check failures

### 3. Attribute Mapping Failure
1. Extract attributes from assertion:
   ```xml
   <saml:Attribute Name="okta.userName">
     <saml:AttributeValue>jsmith</saml:AttributeValue>
   </saml:Attribute>
   ```
2. Compare against expected attribute names:
   - Check SP attribute consumption configuration
   - Verify attribute name format (basic, URI reference)
3. Check Okta attribute statements:
   - Navigate to Okta app "Sign On" tab
   - Review "Attribute Statements" and "Group Attribute Statements"
4. Common causes:
   - Attribute name mismatch (`email` vs `okta.userName`)
   - Group filter not configured correctly
   - NameFormat mismatch

## Resolution

### Fix Audience Mismatch
```bash
# Update Okta application audience URI
# OR update SP configuration to accept the audience
# Document correct audience in runbook
```

### Fix Signature/Certificate Failure
```bash
# Download latest signing certificate from Okta
# Application > Sign On > Signing Certificate

# Update SP configuration with new certificate
# OR enable automatic metadata refresh

# Monitor certificate expiration dates proactively
```

### Fix Attribute Mapping Failure
```bash
# Update Okta attribute statements to send correct names
# Configure group attribute statements with proper filters
# OR update SP to accept alternative attribute names
```

## Prevention
- Monitor SAML certificate expiration dates
- Implement metadata refresh automation
- Document required attributes in integration runbook
- Test SAML configuration after Okta application changes
- Add integration tests for SAML assertion validation

## Key Metrics to Monitor
- `saml_auth_failure_rate_pct`
- `saml_assertion_validation_errors`
- `certificate_days_until_expiry`
- `attribute_mapping_failures`

## Related Compliance
- AUTH_CONFIG_DRIFT
- User authentication SLA
- MTTR targets for SAML incidents

## Related Runbooks
- [General Auth Triage](./general-auth-triage.md)
- [JWKS Rotation Failure](./jwks-rotation-failure.md)
