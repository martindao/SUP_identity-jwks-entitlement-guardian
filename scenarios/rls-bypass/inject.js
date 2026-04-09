// scenarios/rls-bypass/inject.js
// Simulates service role key exposure and RLS bypass

const store = require('../../runtime/store');

function injectRLSBypass() {
  console.log('Injecting RLS bypass scenario...');

  store.setScenarioMode('rls-bypass');

  // Expose service role key
  const tenantState = store.getTenantState();
  tenantState.exposed_keys.push({
    key_type: 'service_role',
    exposed_in: 'frontend_bundle.js',
    exposed_at: new Date().toISOString()
  });
  store.setTenantState(tenantState);

  // Log key exposure
  store.logEvent({
    id: `evt_${Date.now()}_key_exposed`,
    timestamp: new Date().toISOString(),
    service: 'api',
    severity: 'critical',
    message: 'Service role key used in browser - RLS bypass risk',
    correlation_key: 'rls-bypass',
    key_type: 'service_role',
    exposed_in: 'frontend_bundle.js'
  });

  // Simulate cross-tenant queries
  for (let i = 0; i < 5; i++) {
    tenantState.cross_tenant_violations.push({
      timestamp: new Date().toISOString(),
      source_tenant: `attacker_tenant`,
      victim_tenant: `victim_tenant_${i}`,
      query: 'customer_records'
    });

    store.logEvent({
      id: `evt_${Date.now()}_${i}_cross_tenant`,
      timestamp: new Date().toISOString(),
      service: 'api',
      severity: 'critical',
      message: `Cross-tenant query detected using exposed service_role key`,
      correlation_key: 'rls-bypass',
      tenant_id: `victim_tenant_${i}`
    });
  }

  store.setTenantState(tenantState);

  // Update health
  store.updateComponentHealth('auth', 'down');
  store.updateComponentHealth('database', 'down');

  console.log('RLS bypass scenario injected successfully');
  console.log(`  Exposed key type: service_role`);
  console.log(`  Exposed in: frontend_bundle.js`);
  console.log(`  Cross-tenant queries: 5`);
  console.log(`  Victim tenants: 5`);

  return {
    success: true,
    scenario: 'rls-bypass',
    details: {
      exposed_key_type: 'service_role',
      exposed_in: 'frontend_bundle.js',
      cross_tenant_queries: 5,
      affected_victim_tenants: 5
    }
  };
}

if (require.main === module) {
  injectRLSBypass();
}

module.exports = { injectRLSBypass };
