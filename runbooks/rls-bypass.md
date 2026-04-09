# RLS Bypass - Service Role Key Exposed

## Overview
**SECURITY INCIDENT** - A service role key was exposed in a frontend bundle, bypassing Row-Level Security (RLS) and allowing cross-tenant data access. This is a potential data breach requiring immediate security escalation.

## Detection
- Service role key detected in frontend bundle
- Cross-tenant queries without proper authorization
- RLS bypass warnings in logs
- Unauthorized data access patterns

## Immediate Actions
1. **Rotate service role key immediately** - This is P0
2. **Audit logs for unauthorized queries** - Identify what data was accessed
3. **Notify affected customers per breach policy** - Legal requirement

## Compliance Notification Checklist
- [ ] Notify Legal team within 1 hour
- [ ] Notify CISO immediately
- [ ] Begin GDPR Article 33 timer (72 hours to report)
- [ ] Document affected user count for breach notification
- [ ] Preserve all logs and evidence
- [ ] Prepare customer communication draft

## Investigation Steps
1. Identify where key was exposed:
   - Frontend bundle files
   - Git history
   - CI/CD logs
2. Review access logs:
   ```bash
   grep "service_role" runtime/logs.ndjson | grep "cross_tenant"
   ```
3. Determine scope of exposure:
   - Which tenants' data was accessed?
   - What tables/endpoints were queried?
   - Duration of exposure
4. Identify affected users and data sensitivity

## Resolution
1. Rotate compromised key:
   ```bash
   # Generate new service role key
   # Update all backend services
   # Invalidate old key
   ```
2. Search for and remove exposed keys:
   ```bash
   # Frontend bundle audit
   grep -r "service_role" app-under-test/
   ```
3. Implement key exposure detection:
   - Add secret scanning to CI/CD
   - Monitor for service role usage from browser
   - Alert on cross-tenant query patterns

## Prevention
- Never use service role keys in frontend code
- Implement secret scanning in CI/CD pipeline
- Add runtime monitoring for service role key usage
- Audit RLS policies for over-privileged access
- Use anon keys for all frontend operations
- Regular security audits of bundle contents

## Post-Incident
1. Conduct blameless postmortem within 24 hours
2. Update security training materials
3. Review and strengthen key management policies
4. Implement automated detection for future exposures
5. Update incident response playbooks

## Security Escalation
This incident requires immediate escalation to:
- CISO
- Legal team
- Security team lead
- Engineering manager

## Regulatory Considerations
- GDPR Article 33: 72-hour breach notification
- SOC 2: Security incident documentation
- Customer contract breach notification requirements
