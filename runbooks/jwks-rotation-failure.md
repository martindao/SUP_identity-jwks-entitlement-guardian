# JWKS Rotation Failure

## Overview
A signing key was rotated on the JWKS server, but validators with stale JWKS cache are rejecting new tokens, causing authentication failures across tenants.

## Detection
- Auth failure rate spike (> 80% failures)
- JWT signature validation errors
- `kid not in cache` error messages
- Multiple tenants affected simultaneously

## Immediate Actions
1. **Force JWKS cache refresh** on all validators within 60 seconds
2. **Verify key rotation history** - confirm which keys are active vs. rotating
3. **Check stale validator count** - identify services using old keys
4. **Monitor auth failure rate** for recovery confirmation

## Investigation Steps
1. Check JWKS endpoint: `GET /.well-known/jwks.json`
2. Review key rotation history in `jwks-state.json`
3. Identify validators using stale cache:
   - API servers
   - Worker services
   - Any service validating JWTs
4. Review timeline of key rotation vs. first failures

## Resolution
1. Invalidate JWKS cache on all validators:
   ```bash
   # For each validator service
   curl -X POST http://localhost:PORT/admin/cache/jwks/refresh
   ```
2. Verify new key is cached:
   ```bash
   curl http://localhost:PORT/.well-known/jwks.json | jq '.keys[].kid'
   ```
3. Monitor auth failure rate for return to normal (< 1%)

## Prevention
- Implement proactive cache refresh on key rotation
- Set cache TTL < key rotation grace period
- Monitor `cache_stale_validators` metric
- Test key rotation in staging with cache simulation
- Add integration tests for JWKS cache behavior

## Key Metrics to Monitor
- `auth_failure_rate_pct`
- `validators_with_stale_cache`
- `rotation_age_seconds`
- `jwks_cache_hit_rate`

## Related Compliance
- AUTH_OUTAGE
- Customer authentication SLA
- MTTR targets for auth incidents
