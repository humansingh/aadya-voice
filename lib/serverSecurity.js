// firebase-admin/auth is deliberately NOT imported here. It pulls in
// jwks-rsa -> jose@6, which is ESM-only, so a plain require() of it throws
// ERR_REQUIRE_ESM on any Node older than 22.12. Because every API handler
// imports this module, that single import crashed all six functions at cold
// boot on Vercel — an unauthenticated request that should have returned 401
// returned FUNCTION_INVOCATION_FAILED instead. ID tokens are verified below
// with node:crypto against Google's public certificates, which keeps the
// deployment independent of the runtime's Node major version.
// firebase-admin/app and firebase-admin/firestore are safe: both load
// cleanly on every Node version Vercel offers.
const { getApps, initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const crypto = require('crypto');
const { logFailure } = require('./providerError');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'bestpossiblevoice';
const WINDOW_MS = 60_000;
// Tokens are accepted a minute either side of this server's clock, since a
// token minted moments ago on a device with a slightly fast clock is a
// legitimate token, not an attack.
const CLOCK_SKEW_SECONDS = 60;
const memoryBuckets = new Map();
let publicCerts = null;
let publicCertsExpireAt = 0;

function firebaseAdminApp() {
  if (getApps().length) return getApps()[0];
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const serviceAccount = JSON.parse(raw);
    return initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id || PROJECT_ID });
  }
  // Only Firestore uses this app now — the rate-limit counter below. Token
  // verification no longer goes through firebase-admin at all, so a missing
  // service-account credential degrades the shared rate limiter, not sign-in.
  try { return initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID }); }
  catch { return initializeApp({ projectId: PROJECT_ID }); }
}

function configuredLimit() {
  const value = Number(process.env.API_RATE_LIMIT_PER_MINUTE || 30);
  return Number.isFinite(value) && value > 0 ? value : 30;
}

function memoryRateLimit(uid) {
  const now = Date.now();
  const current = memoryBuckets.get(uid);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    memoryBuckets.set(uid, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= configuredLimit();
}

async function distributedRateLimit(uid) {
  const app = firebaseAdminApp();
  const firestore = getFirestore(app);
  const ref = firestore.collection('api_rate_limits').doc(uid);
  const now = Date.now();
  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() || {};
    const startedAt = data.startedAt?.toMillis?.() || 0;
    if (!snapshot.exists || now - startedAt >= WINDOW_MS) {
      transaction.set(ref, {
        startedAt: Timestamp.fromMillis(now),
        count: 1,
        expiresAt: Timestamp.fromMillis(now + WINDOW_MS * 2),
      });
      return true;
    }
    if ((data.count || 0) >= configuredLimit()) return false;
    transaction.update(ref, { count: FieldValue.increment(1) });
    return true;
  });
}

async function enforceRateLimit(uid) {
  const production = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  if (!production && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return memoryRateLimit(uid);
  }
  // Production fails closed if the shared limiter cannot be reached. It never
  // silently falls back to a per-instance Map that resets on a cold start.
  return distributedRateLimit(uid);
}

function decodeJwtPart(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

async function getFirebasePublicCerts() {
  if (publicCerts && Date.now() < publicCertsExpireAt) return publicCerts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', { signal: controller.signal });
    if (!response.ok) throw new Error(`firebase_cert_fetch_${response.status}`);
    publicCerts = await response.json();
    const maxAge = Number((response.headers.get('cache-control') || '').match(/max-age=(\d+)/)?.[1] || 3600);
    publicCertsExpireAt = Date.now() + maxAge * 1000;
    return publicCerts;
  } finally { clearTimeout(timer); }
}

function authError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

// Verifies a real Firebase ID token against Google's rotating public signing
// certificates: RS256 signature first, then every claim that identifies the
// token as belonging to this project and still being valid.
//
// This is now the only verification path, in production as well as locally.
// Recorded trade-off: firebase-admin's verifyIdToken(token, true) also asks
// the Auth backend whether the session was revoked, which this cannot do.
// A cryptographically valid, unexpired token is accepted here even if the
// user signed out or the account was disabled, so revocation takes effect
// when the token expires (Firebase mints them with a one-hour lifetime)
// rather than immediately. That is the cost of not importing
// firebase-admin/auth; see the note at the top of this file.
async function verifyFirebaseToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw authError('invalid_token_shape', 'AUTH_INVALID_TOKEN');

  let header;
  let payload;
  try {
    header = decodeJwtPart(parts[0]);
    payload = decodeJwtPart(parts[1]);
  } catch {
    throw authError('invalid_token_encoding', 'AUTH_INVALID_TOKEN');
  }
  if (header.alg !== 'RS256' || !header.kid) throw authError('invalid_token_header', 'AUTH_INVALID_TOKEN');

  let certs;
  try {
    certs = await getFirebasePublicCerts();
  } catch (error) {
    // Google's certificate endpoint being unreachable is a server-side
    // failure, not a bad token. It must not be reported as a rejected
    // sign-in, or the client sends the user through re-authentication that
    // cannot possibly succeed.
    throw authError(`certificate_fetch_failed: ${error.message}`, 'AUTH_BACKEND_UNAVAILABLE');
  }
  const certificate = certs[header.kid];
  if (!certificate) throw authError('unknown_token_key', 'AUTH_INVALID_TOKEN');

  const validSignature = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${parts[0]}.${parts[1]}`),
    certificate,
    Buffer.from(parts[2], 'base64url'),
  );
  if (!validSignature) throw authError('invalid_token_signature', 'AUTH_INVALID_TOKEN');

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== PROJECT_ID) throw authError('invalid_token_audience', 'AUTH_INVALID_TOKEN');
  if (payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) throw authError('invalid_token_issuer', 'AUTH_INVALID_TOKEN');
  if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) throw authError('invalid_token_subject', 'AUTH_INVALID_TOKEN');
  if (typeof payload.exp !== 'number' || payload.exp <= now) throw authError('token_expired', 'AUTH_INVALID_TOKEN');
  if (typeof payload.iat !== 'number' || payload.iat > now + CLOCK_SKEW_SECONDS) throw authError('token_issued_in_future', 'AUTH_INVALID_TOKEN');

  return { ...payload, uid: payload.sub };
}

async function secureEndpoint(req, res) {
  try {
    const header = String(req.headers?.authorization || '');
    if (!header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'authentication_required' });
      return null;
    }
    const token = header.slice(7).trim();
    const decoded = await verifyFirebaseToken(token);
    if (!await enforceRateLimit(decoded.uid)) {
      res.setHeader?.('Retry-After', '60');
      res.status(429).json({ error: 'rate_limit_exceeded' });
      return null;
    }
    return decoded;
  } catch (error) {
    logFailure('auth', error);
    // A rejected token is the client's problem (401). An unreachable
    // certificate endpoint or an unreachable rate-limit store is ours (503),
    // and the two must stay distinguishable in the response and the logs.
    const unavailable = error?.code === 'AUTH_BACKEND_UNAVAILABLE'
      || String(error?.message || '').includes('credential');
    res.status(unavailable ? 503 : 401).json({ error: unavailable ? 'security_service_unavailable' : 'invalid_authentication' });
    return null;
  }
}

module.exports = { secureEndpoint, firebaseAdminApp };
