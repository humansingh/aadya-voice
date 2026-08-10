const { getApps, initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const crypto = require('crypto');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'bestpossiblevoice';
const WINDOW_MS = 60_000;
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
  // applicationDefault supports Google-hosted credentials; projectId alone is
  // sufficient for ID-token verification in local development.
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

async function verifyFirebaseToken(token) {
  const production = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const hasAdminCredentials = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (production || hasAdminCredentials) return getAuth(firebaseAdminApp()).verifyIdToken(token, true);

  // Local development still verifies the real Firebase JWT against Google's
  // rotating public certificates. It does not weaken production revocation
  // checks or require distributing a service-account key to every developer.
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('invalid_token_shape');
  const header = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('invalid_token_header');
  const certs = await getFirebasePublicCerts();
  const certificate = certs[header.kid];
  if (!certificate) throw new Error('unknown_token_key');
  const validSignature = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), certificate, Buffer.from(parts[2], 'base64url'));
  const now = Math.floor(Date.now() / 1000);
  if (!validSignature || payload.aud !== PROJECT_ID || payload.iss !== `https://securetoken.google.com/${PROJECT_ID}` || !payload.sub || payload.exp <= now || payload.iat > now) {
    throw new Error('invalid_token_claims');
  }
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
    console.error('request security check failed', error?.code || error?.message || error);
    const configurationFailure = String(error?.message || '').includes('credential') && (process.env.NODE_ENV === 'production' || process.env.VERCEL);
    res.status(configurationFailure ? 503 : 401).json({ error: configurationFailure ? 'security_service_unavailable' : 'invalid_authentication' });
    return null;
  }
}

module.exports = { secureEndpoint, firebaseAdminApp };
