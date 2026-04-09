// app-under-test/api/server.js
// Multi-tenant API server with JWT validation

const http = require('http');
const jose = require('jose');
const url = require('url');
const store = require('../../runtime/store');
const { issueToken } = require('../auth/token-issuer');
const tenantStore = require('../shared/tenant-store');

const PORT = 3001;
const JWKS_URL = 'http://localhost:3002/.well-known/jwks.json';

let jwks = null;

async function loadJWKS() {
  try {
    const response = await fetch(JWKS_URL);
    jwks = await response.json();
    return jose.createRemoteJWKSet(new URL(JWKS_URL));
  } catch (error) {
    console.error('Failed to load JWKS:', error);
    return null;
  }
}

async function verifyToken(token) {
  if (!jwks) {
    await loadJWKS();
  }
  
  try {
    const { payload } = await jose.jwtVerify(token, jwks);
    return payload;
  } catch (error) {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  // CORS and cache headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  try {
    // Health check
    if (pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'api' }));
      return;
    }
    
    // Login endpoint (issues JWT)
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        const { tenant_id, user_id } = JSON.parse(body);
        
        // Generate token
        const jwksState = store.getJWKSState();
        const tokenPayload = {
          sub: user_id,
          tenant_id: tenant_id,
          roles: ['user']
        };
        
        // Note: In real implementation, would use actual keys
        const token = 'mock_jwt_token_' + Date.now();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token, tenant_id }));
      });
      return;
    }
    
    // Protected endpoint
    if (pathname === '/api/protected' && req.method === 'GET') {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Protected data', tenant: 'demo' }));
      return;
    }
    
    // Cross-tenant data endpoint (for scenario)
    if (pathname === '/api/data/customer-orders' && req.method === 'GET') {
      const auth = req.headers.authorization;
      const tenantId = auth ? auth.split('_tenant_')[1]?.split('_')[0] : 'tenant_0';
      
      // Simulate cross-tenant exposure
      const crossTenantData = tenantStore.queryWithoutTenantFilter('list_customer_orders', tenantId);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: crossTenantData }));
      return;
    }
    
    // Expose key endpoint (for RLS bypass scenario)
    if (pathname === '/api/keys/expose' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const { key_type, exposed_in } = JSON.parse(body);
        tenantStore.exposeServiceRoleKey(exposed_in);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, key_type, exposed_in }));
      });
      return;
    }
    
    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    
  } catch (error) {
    console.error('API server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

// Start server
loadJWKS().then(() => {
  server.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
});
