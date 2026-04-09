// app-under-test/auth/token-issuer.js
// JWT token issuer using jose library

const jose = require('jose');

async function issueToken(payload, keyPair, kid) {
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuedAt()
    .setIssuer('http://localhost:3002')
    .setAudience('http://localhost:3001')
    .setExpirationTime('1h')
    .sign(keyPair.privateKey);
  
  return jwt;
}

module.exports = { issueToken };
