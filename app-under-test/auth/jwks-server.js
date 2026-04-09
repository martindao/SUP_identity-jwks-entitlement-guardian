// app-under-test/auth/jwks-server.js
// JWKS server with key rotation capability

const http = require('http');
const jose = require('jose');
const store = require('../../runtime/store');

const PORT = 3002;

// In-memory key storage (would be persisted in production)
let currentKeyPair = null;
let previousKeyPair = null;
let currentKeyId = 'key_2026_001';

// Generate initial key pair
async function initializeKeys() {
  currentKeyPair = await jose.generateKeyPair('RS256');
  currentKeyId = 'key_2026_001';
  
  // Update JWKS state in store
  const jwksState = store.getJWKSState();
  jwksState.current_kid = currentKeyId;
  jwksState.keys = [{
    kid: currentKeyId,
    algorithm: 'RS256',
    created_at: new Date().toISOString(),
    status: 'active'
  }];
  store.setJWKSState(jwksState);
}

async function rotateKey() {
  // Store previous key
  previousKeyPair = currentKeyPair;
  const previousKeyId = currentKeyId;
  
  // Generate new key
  currentKeyPair = await jose.generateKeyPair('RS256');
  const keyNumber = parseInt(currentKeyId.split('_')[2]) + 1;
  currentKeyId = `key_2026_${String(keyNumber).padStart(3, '0')}`;
  
  // Update state
  const jwksState = store.getJWKSState();
  
  // Add to rotation history
  jwksState.rotation_history.push({
    from_kid: previousKeyId,
    to_kid: currentKeyId,
    rotated_at: new Date().toISOString()
  });
  
  // Update keys list
  jwksState.previous_kid = previousKeyId;
  jwksState.current_kid = currentKeyId;
  jwksState.keys = [
    {
      kid: currentKeyId,
      algorithm: 'RS256',
      created_at: new Date().toISOString(),
      status: 'active'
    },
    {
      kid: previousKeyId,
      algorithm: 'RS256',
      created_at: jwksState.keys[0]?.created_at || new Date().toISOString(),
      status: 'rotating'
    }
  ];
  
  store.setJWKSState(jwksState);
  
  // Log rotation event
  store.logEvent({
    id: `evt_${Date.now()}_key_rotation`,
    timestamp: new Date().toISOString(),
    service: 'jwks-server',
    severity: 'info',
    message: `Key rotation initiated: ${previousKeyId} -> ${currentKeyId}`,
    correlation_key: 'jwks-rotation',
    old_kid: previousKeyId,
    new_kid: currentKeyId
  });
  
  return { old_kid: previousKeyId, new_kid: currentKeyId };
}

async function getJWKS() {
  const keys = [];
  
  if (currentKeyPair) {
    const publicJwk = await jose.exportJWK(currentKeyPair.publicKey);
    keys.push({
      kid: currentKeyId,
      kty: publicJwk.kty,
      alg: 'RS256',
      use: 'sig',
      ...publicJwk
    });
  }
  
  // Include previous key for grace period
  if (previousKeyPair) {
    const previousPublicJwk = await jose.exportJWK(previousKeyPair.publicKey);
    const jwksState = store.getJWKSState();
    keys.push({
      kid: jwksState.previous_kid,
      kty: previousPublicJwk.kty,
      alg: 'RS256',
      use: 'sig',
      ...previousPublicJwk
    });
  }
  
  return { keys };
}

function getOpenIdConfig() {
  return {
    issuer: 'http://localhost:3002',
    jwks_uri: 'http://localhost:3002/.well-known/jwks.json',
    response_types_supported: ['id_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256']
  };
}

// HTTP server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Cache-busting headers
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  try {
    if (req.url === '/.well-known/jwks.json' && req.method === 'GET') {
      const jwks = await getJWKS();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(jwks));
    }
    else if (req.url === '/.well-known/openid-configuration' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getOpenIdConfig()));
    }
    else if (req.url === '/admin/rotate-key' && req.method === 'POST') {
      const result = await rotateKey();
      
      // Increment stale cache validators count
      const jwksState = store.getJWKSState();
      jwksState.cache_stale_validators = (jwksState.cache_stale_validators || 0) + 7;
      store.setJWKSState(jwksState);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...result }));
    }
    else if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'jwks-server' }));
    }
    else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    console.error('JWKS server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

// Initialize keys and start server
initializeKeys().then(() => {
  server.listen(PORT, () => {
    console.log(`JWKS server running on port ${PORT}`);
    console.log(`  JWKS: http://localhost:${PORT}/.well-known/jwks.json`);
  });
});

module.exports = { getJWKS, rotateKey, getCurrentKeyId: () => currentKeyId };
