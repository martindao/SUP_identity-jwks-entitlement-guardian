# SAML Troubleshooting Guide

> **IMPORTANT:** This document describes simulated support evidence for demonstration purposes. This is NOT a live IdP integration. All assertions, certificates, and attribute mappings shown here are mock proof artifacts.

## Overview

When SAML authentication fails, support engineers need to quickly identify whether the issue stems from audience configuration, certificate/signature problems, or attribute mapping mismatches. This guide covers the most common SAML failure modes and provides diagnostic steps for each.

## Support Workflow

1. **Identify the failure type** from error messages or logs
2. **Gather evidence** from the SAML assertion and IdP configuration
3. **Diagnose the root cause** using the steps below
4. **Remediate or escalate** based on findings

---

## Failure Mode 1: Audience Mismatch

### What It Looks Like

- Error message: `Audience restriction validation failed`
- Error message: `Assertion is not intended for this service provider`
- Users see: "Authentication failed" or "Invalid request"

### How to Diagnose

1. **Extract the audience from the SAML assertion:**
   ```xml
   <saml:AudienceRestriction>
     <saml:Audience>https://wrong-sp.example.com</saml:Audience>
   </saml:AudienceRestriction>
   ```

2. **Compare against the expected audience URI** configured in your service provider:
   - Check the SP metadata or configuration
   - Expected format: `https://your-app.example.com/saml/acs` or similar

3. **Check Okta application settings:**
   - Navigate to the Okta application
   - Verify "Single Sign On URL" and "Audience URI" match your SP configuration

### Common Causes

- SP metadata was regenerated with a different entity ID
- Okta application was cloned without updating audience
- Environment mismatch (production vs. staging URIs)

### Remediation

- Update the audience URI in Okta to match your SP's expected value
- OR update your SP configuration to accept the audience in the assertion
- Document the correct audience in your runbook for future reference

---

## Failure Mode 2: Stale Certificate / Signature Mismatch

### What It Looks Like

- Error message: `Signature validation failed`
- Error message: `Unable to verify signature`
- Error message: `Certificate expired`
- Users see: "Authentication failed" with no specific message

### How to Diagnose

1. **Check the signing certificate expiration:**
   ```bash
   # Extract certificate from IdP metadata or assertion
   openssl x509 -in idp-cert.pem -text -noout | grep -A 2 "Validity"
   ```

2. **Verify the certificate in the assertion matches the IdP's current certificate:**
   - Compare the `KeyDescriptor` in IdP metadata
   - Check if a certificate rotation occurred recently

3. **Review Okta certificate rotation history:**
   - Okta rotates signing certificates periodically
   - Check if the SP still has the old certificate cached

4. **Check signature algorithm compatibility:**
   - Okta typically uses `rsa-sha256` or `rsa-sha1`
   - Ensure your SP supports the algorithm used

### Common Causes

- IdP rotated signing certificate, SP not updated
- SP has hardcoded certificate instead of dynamic metadata refresh
- Clock skew causing certificate validity checks to fail

### Remediation

- Update the IdP signing certificate in your SP configuration
- Enable automatic metadata refresh if supported
- For Okta: Download the latest signing certificate from the application's "Sign On" tab
- Monitor certificate expiration dates proactively

---

## Failure Mode 3: Attribute Mapping Failure

### What It Looks Like

- User authenticates successfully but missing required attributes
- Error message: `Required attribute not found`
- Application shows: "User profile incomplete" or "Access denied"
- Authorization checks fail after successful authentication

### How to Diagnose

1. **Extract attributes from the SAML assertion:**
   ```xml
   <saml:AttributeStatement>
     <saml:Attribute Name="okta.userName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
       <saml:AttributeValue>jsmith@example.com</saml:AttributeValue>
     </saml:Attribute>
     <saml:Attribute Name="okta.groups" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
       <saml:AttributeValue>Admins</saml:AttributeValue>
       <saml:AttributeValue>Developers</saml:AttributeValue>
     </saml:Attribute>
   </saml:AttributeStatement>
   ```

2. **Compare against expected attribute names:**
   - Check your SP's attribute consumption configuration
   - Verify attribute name format (basic, URI reference, etc.)

3. **Check Okta attribute mappings:**
   - Navigate to the Okta application's "Sign On" tab
   - Review "Attribute Statements" and "Group Attribute Statements"
   - Verify attribute names match what your SP expects

4. **Verify attribute values:**
   - Check if required groups are being sent
   - Verify email format matches expected pattern
   - Check for missing optional attributes that your app requires

### Common Causes

- Attribute name mismatch (e.g., `email` vs `okta.userName`)
- Group filter not configured correctly in Okta
- Attribute not configured in Okta application profile
- NameFormat mismatch between assertion and SP expectation

### Remediation

- Update Okta attribute statements to send correct attribute names
- Configure group attribute statements with proper filters
- Update SP to accept alternative attribute names if needed
- Document required attributes in your integration runbook

---

## Evidence Collection Checklist

When escalating a SAML issue, gather the following:

- [ ] SAML assertion (base64-decoded)
- [ ] IdP metadata (current version)
- [ ] SP metadata or configuration
- [ ] Error message from application logs
- [ ] Timestamp of the failure
- [ ] User identifier (email or username)
- [ ] Okta application name and ID

## Sample Assertion Reference

A sample SAML assertion artifact is available at `artifacts/samples/saml-assertion.xml`. This is a mock proof artifact for demonstration purposes and should NOT be used for production debugging.

## Related Runbooks

- [JWKS Rotation Failure](../runbooks/jwks-rotation-failure.md) - JWT signing key issues
- [Cross-Tenant Exposure](../runbooks/cross-tenant-exposure.md) - Tenant isolation failures

## Compliance Considerations

- SAML assertions may contain PII - handle according to data protection policies
- Log retention for authentication failures may have compliance requirements
- Document all remediation steps for audit trail
