// scenarios/cross-tenant-exposure/inject.js
// Simulates cross-tenant data exposure from missing query filter

const store = require('../../runtime/store');

function injectCrossTenantExposure() {
  console.log('Injecting cross-tenant exposure scenario...');

  store.setScenarioMode('cross-tenant');

  // Register vulnerable query
  const tenantState = store.getTenantState();

  // Log missing tenant filter warning
  store.logEvent({
    id: `evt_${Date.now()}_query_warn`,
    timestamp: new Date().toISOString(),
    service: 'api',
    severity: 'warning',
    message: 'Query missing tenant_id filter: list_customer_orders',
    correlation_key: 'cross-tenant-exposure',
    query: 'list_customer_orders'
  });

  // Simulate users running the broken query
  for (let i = 0; i < 8; i++) {
    const sourceTenant = `tenant_${i}`;
    const visibleToTenant = `tenant_${(i + 1) % 8}`;

    tenantState.cross_tenant_violations.push({
      timestamp: new Date().toISOString(),
      source_tenant: sourceTenant,
      visible_to: visibleToTenant,
      query: 'list_customer_orders',
      missing_filter: 'tenant_id'
    });

    store.logEvent({
      id: `evt_${Date.now()}_${i}_data_leak`,
      timestamp: new Date().toISOString(),
      service: 'api',
      severity: 'critical',
      message: `Cross-tenant data returned: ${sourceTenant} -> visible to ${visibleToTenant}`,
      correlation_key: 'cross-tenant-exposure',
      tenant_id: sourceTenant,
      query: 'list_customer_orders'
    });
  }

  store.setTenantState(tenantState);

  // Log tenant isolation violation
  store.logEvent({
    id: `evt_${Date.now()}_violation`,
    timestamp: new Date().toISOString(),
    service: 'api',
    severity: 'critical',
    message: 'Tenant isolation violation: 8 cross-tenant data exposures detected',
    correlation_key: 'cross-tenant-exposure',
    affected_request_count: 8
  });

  // Update health
  store.updateComponentHealth('api', 'degraded');
  store.updateComponentHealth('database', 'degraded');

  console.log('Cross-tenant exposure scenario injected successfully');
  console.log(`  Vulnerable query: list_customer_orders`);
  console.log(`  Missing filter: tenant_id`);
  console.log(`  Affected requests: 8`);
  console.log(`  Data leaked between tenants: 8 instances`);

  return {
    success: true,
    scenario: 'cross-tenant',
    details: {
      vulnerable_query: 'list_customer_orders',
      missing_filter: 'tenant_id',
      affected_request_count: 8,
      data_leaked_between_tenants: 8
    }
  };
}

if (require.main === module) {
  injectCrossTenantExposure();
}

module.exports = { injectCrossTenantExposure };
