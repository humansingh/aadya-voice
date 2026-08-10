// Minimal local dev server — mounts the Vercel serverless functions in api/*.js
// on top of a plain Node http server, without needing the Vercel CLI.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAX_JSON_BYTES = 12 * 1024 * 1024;
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map();

// --- load .env (no dotenv dependency) ---
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}
const configuredRateLimit = Number(process.env.API_RATE_LIMIT_PER_MINUTE || 30);
const RATE_LIMIT = Number.isFinite(configuredRateLimit) && configuredRateLimit > 0 ? configuredRateLimit : 30;

const routes = {
  '/api/transcribe': require('../api/transcribe'),
  '/api/guard-input': require('../api/guard-input'),
  '/api/answer': require('../api/answer'),
  '/api/speak': require('../api/speak'),
  '/api/opportunities': require('../api/opportunities'),
  '/api/artifact': require('../api/artifact'),
};

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8',
};

function serveStatic(req, res) {
  let filePath = req.url.split('?')[0];
  if (filePath === '/') filePath = '/landing.html';
  let decodedPath;
  try { decodedPath = decodeURIComponent(filePath); }
  catch (error) { res.writeHead(400); return res.end('Bad request'); }
  const resolved = path.resolve(ROOT, `.${decodedPath}`);
  if (resolved !== ROOT && !resolved.startsWith(`${ROOT}${path.sep}`)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(resolved, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    const ext = path.extname(resolved);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function withHelpers(res) {
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
  return res;
}

function setSecurityHeaders(res, isApi) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'microphone=(self), camera=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (isApi) res.setHeader('Cache-Control', 'no-store');
}

function allowRequest(req) {
  const key = req.socket.remoteAddress || 'local';
  const now = Date.now();
  if (rateBuckets.size > 2000) {
    for (const [bucketKey, bucket] of rateBuckets) {
      if (now - bucket.startedAt >= RATE_WINDOW_MS) rateBuckets.delete(bucketKey);
    }
  }
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= RATE_LIMIT;
}

const server = http.createServer((req, res) => {
  const handler = routes[req.url.split('?')[0]];
  withHelpers(res);
  setSecurityHeaders(res, Boolean(handler));

  if (!handler) return serveStatic(req, res);
  if (!allowRequest(req)) return res.status(429).json({ error: 'rate_limit_exceeded' });
  if (req.method !== 'POST') return handler(req, res);
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return res.status(415).json({ error: 'application/json required' });

  let raw = '';
  let tooLarge = false;
  req.on('data', (chunk) => {
    if (tooLarge) return;
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_JSON_BYTES) {
      tooLarge = true;
      res.status(413).json({ error: 'request_too_large' });
    }
  });
  req.on('end', () => {
    if (tooLarge) return;
    try {
      req.body = raw ? JSON.parse(raw) : {};
    } catch (e) {
      return res.status(400).json({ error: 'invalid_json' });
    }
    Promise.resolve(handler(req, res)).catch((err) => {
      console.error('handler error', err);
      if (!res.headersSent) res.status(500).json({ error: 'internal_error' });
    });
  });
});
server.requestTimeout = 30_000;
server.headersTimeout = 10_000;

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Aadya local dev server running at http://localhost:${PORT}`);
  console.log(`Listening on all network interfaces (${HOST})`);
  console.log(`GROQ_API_KEY loaded: ${process.env.GROQ_API_KEY ? 'yes' : 'NO — missing!'}`);
});
