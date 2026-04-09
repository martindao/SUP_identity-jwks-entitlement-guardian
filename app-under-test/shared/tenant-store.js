// app-under-test/shared/tenant-store.js
// Simulated tenant data storage with RLS enforcement

const fs = require('fs');
const path = require('path');
const store = require('../../runtime/store');

const TENANT_DATA_FILE = path.join(__dirname, '../../runtime/tenant-data.json');

// Sample tenant data
const DEFAULT_TENANT_DATA = {
  tenant_0: {
    customers: [
      { id: 'c001', name: 'Customer A', email: 'a@tenant0.com' },
      { id: 'c002', name: 'Customer B', email: 'b@tenant0.com' }
    ],
    orders: [
      { id: 'o001', customer_id: 'c001', amount: 100 },
      { id: 'o002', customer_id: 'c002', amount: 200 }
    ]
  },
  tenant_1: {
    customers: [
      { id: 'c003', name: 'Customer C', email: 'c@tenant1.com' },
      { id: 'c004', name: 'Customer D', email: 'd@tenant1.com' }
    ],
    orders: [
      { id: 'o003', customer_id: 'c003', amount: 150 },
      { id: 'o004', customer_id: 'c004', amount: 250 }
    ]
  },
  tenant_2: {
    customers: [
      { id: 'c005', name: 'Customer E', email: 'e@tenant2.com' }
    ],
    orders: [
      { id: 'o005', customer_id: 'c005', amount: 300 }
    ]
  }
};

function getTenantData(tenantId, table) {
  const data = readTenantData();
  
  if (!data[tenantId]) {
    return [];
  }
  
  if (!table) {
    return data[tenantId];
  }
  
  // RLS enforcement: only return data for the specified tenant
  return data[tenantId][table] || [];
}

function readTenantData() {
  try {
    return JSON.parse(fs.readFileSync(TENANT_DATA_FILE, 'utf8'));
  } catch {
    // Initialize default data
    fs.writeFileSync(TENANT_DATA_FILE, JSON.stringify(DEFAULT_TENANT_DATA, null, 2));
    return DEFAULT_TENANT_DATA;
  }
}

function queryWithoutTenantFilter(queryName, requestingTenantId) {
  // Intentionally broken query for cross-tenant exposure scenario
  // Returns ALL tenant data instead of filtering by tenant_id
  
  const data = readTenantData();
  const allData = [];
  
  // This is the security vulnerability - returns all tenants' data
  for (const [tenantId, tenantData] of Object.entries(data)) {
    if (tenantId !== requestingTenantId) {
      // Cross-tenant data leak
      for (const [table, records] of Object.entries(tenantData)) {
        for (const record of records) {
          allData.push({
            ...record,
            _source_tenant: tenantId,
            _visible_to: requestingTenantId
          });
        }
      }
    }
  }
  
  // Log the cross-tenant violation
  store.logEvent({
    id: `evt_${Date.now()}_cross_tenant`,
    timestamp: new Date().toISOString(),
    service: 'api',
    severity: 'critical',
    message: `Cross-tenant data returned by query ${queryName} - missing tenant_id filter`,
    correlation_key: 'cross-tenant-exposure',
    query: queryName,
    tenant_id: requestingTenantId
  });
  
  // Track violation
  const tenantState = store.getTenantState();
  tenantState.cross_tenant_violations.push({
    timestamp: new Date().toISOString(),
    source_tenant: Object.keys(data).find(t => t !== requestingTenantId),
    visible_to: requestingTenantId,
    query: queryName
  });
  store.setTenantState(tenantState);
  
  return allData;
}

function exposeServiceRoleKey(location) {
  const tenantState = store.getTenantState();
  
  tenantState.exposed_keys.push({
    key_type: 'service_role',
    exposed_in: location,
    exposed_at: new Date().toISOString()
  });
  
  store.setTenantState(tenantState);
  
  // Log the exposure
  store.logEvent({
    id: `evt_${Date.now()}_key_exposed`,
    timestamp: new Date().toISOString(),
    service: 'api',
    severity: 'critical',
    message: `Service role key exposed in ${location} - RLS bypass risk`,
    correlation_key: 'rls-bypass'
  });
  
  store.updateComponentHealth('auth', 'down');
  store.updateComponentHealth('database', 'down');
}

function getExposedKeys() {
  const tenantState = store.getTenantState();
  return tenantState.exposed_keys || [];
}

function getCrossTenantViolations() {
  const tenantState = store.getTenantState();
  return tenantState.cross_tenant_violations || [];
}

module.exports = {
  getTenantData,
  queryWithoutTenantFilter,
  exposeServiceRoleKey,
  getExposedKeys,
  getCrossTenantViolations
};
