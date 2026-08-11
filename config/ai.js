// Sole source of truth for provider selection, model IDs, and supported
// languages. Every setting is a named constant with a sensible default,
// overridable by environment variable — nothing here should require
// editing this file to change a model or flip a feature. Comments are
// documentation only, never the switching mechanism. Validated at import
// time; throws on boot for an unknown model ID, a missing required field,
// or an out-of-range numeric, rather than failing confusingly later.
//
// Wired into every api/*.js handler and lib/translate.js. See
// docs/PROVIDER-HISTORY.md for what each task group replaced.
//
// Cost-control tunables (max_output_tokens, retrieved-doc cap, turn cap,
// retry/backoff, per-session timeout, daily spend ceiling, DRY_RUN) are
// not in this file yet — they land in a later commit alongside usage
// logging, which is what makes them meaningful to tune.

function readEnv(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function readBool(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true';
}

function assert(condition, message) {
  if (!condition) throw new Error(`[config/ai] ${message}`);
}

// --- Task-group model selection ---------------------------------------
// Model stack is final (product decision, not a suggestion) — see the
// allowlists below. Do not add realtime/audio-in-out models, OpenAI TTS,
// -pro tiers, search-preview models, or image/video models.

const ALLOWED_MODELS = {
  transcription: ['gpt-transcribe'],
  liveCaptions: ['gpt-live-transcribe'],
  embeddings: ['text-embedding-3-large'],
  reasoning: ['gpt-5.6-terra'],
  lightweight: ['gpt-5.6-luna'],
  moderation: ['omni-moderation-latest'],
};

const TASKS = {
  transcription: {
    provider: 'openai',
    model: readEnv('TRANSCRIPTION_MODEL', 'gpt-transcribe'),
    // What: committed-turn speech-to-text (transcribe after the user stops
    // speaking, not a live stream).
    // Price: check platform.openai.com/pricing for the current per-minute
    // rate before estimating cost — not hardcoded here, it changes.
    // Why: committed-turn keeps cost predictable and matches the product's
    // tap-to-ask flow; live transcription is a separate, opt-in task below.
  },
  liveCaptions: {
    enabled: readBool('LIVE_CAPTIONS_ENABLED', false),
    provider: 'openai',
    model: readEnv('LIVE_CAPTIONS_MODEL', 'gpt-live-transcribe'),
    // What: live/streaming captions for a demo screen, not production STT.
    // Price: roughly 4x committed-turn transcription — see platform docs.
    // Why: off by default. Only worth the extra cost for a live demo
    // where a visible caption stream matters more than budget.
  },
  embeddings: {
    provider: 'openai',
    model: readEnv('EMBEDDINGS_MODEL', 'text-embedding-3-large'),
    // What: embeds the ~173-record opportunity corpus (offline, cached
    // permanently) and each incoming query (~240 tokens, at runtime).
    // Price: check platform.openai.com/pricing — embeddings are cheap,
    // but confirm before estimating, especially the one-time corpus cost.
    // Why: multilingual embedding quality was the deciding factor; the
    // corpus is small enough that cost is not the constraint here.
  },
  reasoning: {
    provider: 'openai',
    model: readEnv('REASONING_MODEL', 'gpt-5.6-terra'),
    // What: eligibility reasoning, answer cards, application drafts.
    // Price: check platform.openai.com/pricing — output is priced well
    // above input, which is why max_output_tokens (a later commit) matters.
    // Why: the Terra/Luna split is a SAFETY rule, not a cost rule — if a
    // wrong output could cost someone a benefit they're entitled to, it
    // is Terra. Never Luna for eligibility, answer cards or drafts.
  },
  lightweight: {
    provider: 'openai',
    model: readEnv('LIGHTWEIGHT_MODEL', 'gpt-5.6-luna'),
    // What: cleanup, query expansion, titles, chip labels — anything
    // where a wrong output costs nothing but a mildly worse UI moment.
    // Price: check platform.openai.com/pricing.
    // Why: cheaper and faster than Terra for non-safety-critical text
    // shaping; never used for eligibility, answer cards or drafts.
  },
  moderation: {
    provider: 'openai',
    model: readEnv('MODERATION_MODEL', 'omni-moderation-latest'),
    // What: blocking output-safety gate on generated answers (see
    // api/answer.js). Secondary layer behind the deterministic keyword
    // floor in lib/safety.js.
    // Price: free at the time of writing — confirm at platform.openai.com/pricing.
    // Why: OpenAI's purpose-built moderation model; no reason to route
    // this through Terra/Luna.
    failMode: readEnv('MODERATION_FAIL_MODE', 'open').toLowerCase() === 'closed' ? 'closed' : 'open',
    // open (default): a moderation-call failure serves the answer anyway,
    // logs it, flags moderation_skipped — a transient outage shouldn't
    // take the app down mid-demo. closed: fails the response instead.
  },
  speech: {
    provider: 'google-cloud-tts',
    // What: production text-to-speech. Deliberately NOT an OpenAI model —
    // Google Cloud TTS was already working, is billed separately from the
    // OpenAI budget, and covers all seven supported languages with a
    // matching Chirp3-HD voice set (see `languages` below).
  },
};

// --- Supported languages ------------------------------------------------
// Single source of truth for which languages are selectable and how each
// one maps to a Google Cloud TTS BCP-47 code. lib/apiValidation.js reads
// this directly (server-side). lib/preferences.js cannot — it is
// client-side, unbundled, loaded straight into the browser with no build
// step, so it keeps a manually-maintained mirror instead; a test in
// scripts/test-product.js asserts the two stay in sync so drift fails the
// suite rather than shipping silently.
//
// `ttsVoiceId` records the confirmed default Chirp3-HD persona for
// reference — actual voice selection still goes through the live
// voices.list discovery + persona matching in api/speak.js, which is more
// robust to a renamed/withdrawn voice. This field is not read by that
// code path; it documents what was verified to exist.
//
// `transcriptionHints` (scheme names, districts, common transliterations
// per language, meant to be passed to gpt-transcribe as a prompt hint) are
// intentionally empty — real hint data is future work, not something to
// fabricate now. api/transcribe.js does not read this field yet.
//
// `verified: true` means the language has been exercised end to end
// (Aman's call — five of these seven are newly added and not yet
// native-speaker reviewed; see the review-status notices in the product
// itself, not a flag flip here).

const LANGUAGES = [
  {
    code: 'en',
    label: 'English',
    ttsLanguageCode: 'en-IN',
    ttsVoiceId: 'en-IN-Chirp3-HD-Aoede',
    transcriptionHints: [],
    verified: true,
  },
  {
    code: 'hi',
    label: 'हिंदी',
    ttsLanguageCode: 'hi-IN',
    ttsVoiceId: 'hi-IN-Chirp3-HD-Aoede',
    transcriptionHints: [],
    verified: true,
  },
  {
    code: 'mr',
    label: 'मराठी',
    ttsLanguageCode: 'mr-IN',
    ttsVoiceId: 'mr-IN-Chirp3-HD-Aoede',
    transcriptionHints: [], // TODO: scheme names, districts, transliterations
    verified: true,
  },
  {
    code: 'ta',
    label: 'தமிழ்',
    ttsLanguageCode: 'ta-IN',
    ttsVoiceId: 'ta-IN-Chirp3-HD-Aoede',
    transcriptionHints: [], // TODO: scheme names, districts, transliterations
    verified: true,
  },
  {
    code: 'te',
    label: 'తెలుగు',
    ttsLanguageCode: 'te-IN',
    ttsVoiceId: 'te-IN-Chirp3-HD-Aoede',
    transcriptionHints: [], // TODO: scheme names, districts, transliterations
    verified: true,
  },
  {
    code: 'kn',
    label: 'ಕನ್ನಡ',
    ttsLanguageCode: 'kn-IN',
    ttsVoiceId: 'kn-IN-Chirp3-HD-Aoede',
    transcriptionHints: [], // TODO: scheme names, districts, transliterations
    verified: true,
  },
  {
    code: 'ml',
    label: 'മലയാളം',
    ttsLanguageCode: 'ml-IN',
    ttsVoiceId: 'ml-IN-Chirp3-HD-Aoede',
    transcriptionHints: [], // TODO: scheme names, districts, transliterations
    verified: true,
  },
];

// --- Language-presentation rule ------------------------------------------
// Formatting instruction for Terra, not a translation step. The
// multilingual pipeline stays: transcribe in the spoken language with
// hints -> embed and search the English corpus -> deterministic
// state/category filters in code -> Terra gets the ORIGINAL question plus
// retrieved English evidence -> Terra answers directly in the user's
// language. This constant governs only how that direct answer presents a
// specific set of facts, so it stays usable at an office counter.

const LANGUAGE_PRESENTATION_RULE = `When answering in a language other than English, keep these in a form the user can act on at an office counter, not translated:
- Currency amounts as Western digits with the rupee symbol: ₹6,000 — never spelled out as words, never in Indic numerals.
- Dates and deadlines as digits.
- Scheme, portal and office names in the user's script, followed by the official English name in parentheses — e.g. "பிஎம்-கிசான் (PM-KISAN)".
- Document names the same way — e.g. "आधार कार्ड (Aadhaar)".
Reason: these are exactly what appears on the physical form, the office board, and the website the user will type into. A translated version of any of these becomes unusable at the counter.
Everything else — eligibility conditions, next steps, and the caveat — should be in the user's language, plain and short.`;

// --- Validation -----------------------------------------------------------

function validateConfig() {
  for (const [task, def] of Object.entries(TASKS)) {
    const allowed = ALLOWED_MODELS[task];
    if (!allowed) continue; // speech has no OpenAI model to check
    assert(typeof def.model === 'string' && def.model.length > 0, `${task}.model must be a non-empty string`);
    assert(allowed.includes(def.model), `${task}.model "${def.model}" is not an allowed model for this task. Allowed: ${allowed.join(', ')}`);
  }
  assert(TASKS.moderation.failMode === 'open' || TASKS.moderation.failMode === 'closed', 'moderation.failMode must be "open" or "closed"');
  assert(typeof TASKS.liveCaptions.enabled === 'boolean', 'liveCaptions.enabled must be a boolean');

  assert(Array.isArray(LANGUAGES) && LANGUAGES.length > 0, 'languages must be a non-empty array');
  const seenCodes = new Set();
  for (const lang of LANGUAGES) {
    assert(/^[a-z]{2}$/.test(lang.code), `language code "${lang.code}" must be a 2-letter lowercase code`);
    assert(!seenCodes.has(lang.code), `duplicate language code "${lang.code}"`);
    seenCodes.add(lang.code);
    assert(typeof lang.label === 'string' && lang.label.length > 0, `language "${lang.code}" is missing a label`);
    assert(/^[a-z]{2}-[A-Z]{2}$/.test(lang.ttsLanguageCode), `language "${lang.code}" has an invalid ttsLanguageCode "${lang.ttsLanguageCode}"`);
    assert(typeof lang.verified === 'boolean', `language "${lang.code}".verified must be a boolean`);
    assert(Array.isArray(lang.transcriptionHints), `language "${lang.code}".transcriptionHints must be an array`);
  }
}

validateConfig();

module.exports = { TASKS, LANGUAGES, LANGUAGE_PRESENTATION_RULE };
