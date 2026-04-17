# SCIM Provisioning Drift

## Overview
**PROVISIONING INCIDENT** - SCIM sync between identity provider and downstream application has drifted, causing user access issues. Users may be missing expected permissions, have unauthorized access, or fail to provision/deprovision correctly.

## Detection
- Provision request failures in sync logs
- Terminated users still have active access
- Group/role membership mismatches between IdP and application
- User sync errors in SCIM integration dashboard
- Access denied errors for newly provisioned users

## Immediate Actions
1. **Verify sync status** - Check IdP provisioning dashboard for error codes
2. **Identify affected users** - Compare IdP user list with downstream application
3. **Check service account token** - Validate token hasn't expired
4. **Force manual sync** - Trigger provisioning sync for affected users

## Provisioning Failure Triage

### Token Expired (401 Unauthorized)
1. Navigate to IdP SCIM integration settings
2. Generate new service account token
3. Update token in downstream application SCIM configuration
4. Test connectivity with provision request
5. Force full sync to reconcile state

### Duplicate User (409 Conflict)
1. Search downstream application for existing user by email
2. Compare externalId values between IdP and application
3. Resolve duplicate by merging or deleting orphaned account
4. Re-sync user from IdP

### Missing Required Field (400 Bad Request)
1. Review SCIM payload in sync logs
2. Identify missing required attribute
3. Verify attribute mapping in IdP configuration
4. Add missing mapping or default value
5. Retry provision request

## Deprovisioning Failure Triage

### User Remains Active After Termination
1. **Verify termination status** - Confirm user is deactivated in HRIS/IdP
2. **Check sync timestamp** - When did last SCIM sync occur?
3. **Force deprovision sync** - Trigger manual sync for terminated user
4. **Audit access** - Document any access after termination for compliance
5. **Revoke sessions** - Manually invalidate active sessions if needed

### Deprovision Failed Silently
1. Check SCIM endpoint audit logs for DELETE/PATCH response
2. Verify endpoint returned 204 (delete) or 200 (patch)
3. Check if downstream app processes `active` flag on authentication
4. Implement session revocation if app doesn't check active status

## Group/Role Sync Mismatch Triage

### Missing Group Membership
1. **Compare memberships**:
   - IdP groups: `Okta-Admins`, `Okta-Users`
   - App roles: `User` (missing Admin)
2. **Verify group mapping**:
   ```
   Okta-Admins → Admin role
   Okta-Users → User role
   Okta-Sales → Sales role
   ```
3. **Check sync order** - User may have been created before group assignment
4. **Re-sync user** - Trigger provisioning sync after group assignment

### Extra/Unauthorized Group Membership
1. **Document discrepancy** - User has role they shouldn't
2. **Check sync logs** - When was extra group assigned?
3. **Remove unauthorized role** - Manually revoke if sync doesn't correct
4. **Audit access** - Document any actions taken with unauthorized role
5. **Review group mapping** - Ensure no overlapping mappings

## Resolution Steps

### For Provision Failures
1. Fix root cause (token, mapping, duplicate)
2. Force full sync for affected users
3. Verify user can authenticate
4. Confirm group memberships are correct

### For Deprovision Failures
1. Force deprovision sync
2. Manually deactivate user if sync fails
3. Revoke all active sessions
4. Audit post-termination access for compliance

### For Group/Role Mismatches
1. Correct group-to-role mapping if needed
2. Re-sync affected users
3. Verify permissions match IdP groups
4. Test with known user account

## Escalation Criteria

Escalate to identity engineering when:
- SCIM endpoint returns 5xx errors consistently
- Token refresh fails repeatedly
- Sync latency exceeds 4 hours
- Multiple users affected by same mapping issue
- Deprovisioning failures for terminated employees (security risk)

## Evidence to Capture

For audit and compliance purposes, document:
1. **User identity** — externalId, userName, email
2. **Expected state** — What groups/roles should user have
3. **Actual state** — What groups/roles user has
4. **Sync logs** — Timestamps, error codes, affected operations
5. **Remediation steps** — Actions taken to resolve

## Compliance Considerations

- **GDPR Article 32** — Ensure timely deprovisioning to prevent unauthorized access
- **SOC 2** — Document provisioning/deprovisioning for access control audits
- **SOX** — Maintain evidence of role changes for financial system access

## Prevention

- Monitor SCIM sync health dashboards
- Set up alerts for sync failures and drift
- Implement automated token rotation
- Regular audits of group-to-role mappings
- Test deprovisioning flow quarterly

## Post-Incident

1. Document root cause in incident ticket
2. Update SCIM troubleshooting runbook if new issue discovered
3. Review token rotation schedule if applicable
4. Schedule follow-up audit for affected users
5. Update monitoring to catch similar issues earlier
