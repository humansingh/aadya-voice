const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ACTIVE_PAGES = ['landing.html', 'demo.html', 'index.html', 'integrations.html', 'signup.html', 'about.html'];
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

async function main() {
  for (const page of ACTIVE_PAGES) {
    const html = read(page);
    assert(html.includes('./lib/preferences.js'), `${page} must load shared preferences`);
    const moduleScripts = [...html.matchAll(/<script\s+type=["']module["'][^>]*>([\s\S]*?)<\/script>/gi)];
    assert(moduleScripts.length, `${page} must contain a module script`);
    moduleScripts.forEach((match, index) => new vm.SourceTextModule(match[1], { identifier: `${page}#${index}` }));
  }

  const landing = read('landing.html');
  const index = read('index.html');
  const preferences = read('lib/preferences.js');
  const rules = read('firestore.rules');
  const demo = read('demo.html');
  const signup = read('signup.html');
  const about = read('about.html');
  const providerApiFiles = ['answer', 'transcribe', 'speak', 'guard-input', 'artifact'].map((name) => read(`api/${name}.js`));
  const authenticatedApiNames = ['answer', 'transcribe', 'speak', 'guard-input', 'opportunities', 'artifact'];

  assert(!fs.existsSync(path.join(ROOT, 'get-started.html')), 'setup wizard must be deleted');
  assert(!fs.existsSync(path.join(ROOT, 'old-copy')), 'old-copy must be deleted');
  assert(!landing.includes('signup-nudge') && !landing.includes('AADYA_SIGNUP_NUDGE_DELAY_MS'), 'signup nudge must be deleted');
  assert(landing.includes('href="./signup.html?mode=signin">Sign in</a>') && landing.includes('href="./signup.html?mode=signup">Create account</a>'), 'landing sign-in and create-account links missing');
  assert(!landing.includes('id="cost-controls"') && about.includes('id="cost-controls"') && about.includes('updateCostView') && about.includes('Pricing checked 11 August 2026'), 'live cost view must live on About, not the landing hero');
  assert(about.includes('https://platform.openai.com/docs/pricing') && about.includes('https://cloud.google.com/text-to-speech/pricing'), 'cost assumptions must link official pricing');
  assert(signup.includes('createUserWithEmailAndPassword') && signup.includes('signInWithEmailAndPassword') && signup.includes('sendPasswordResetEmail'), 'full-page account actions missing');
  assert(signup.includes('linkWithCredential') && signup.includes('auth.currentUser?.isAnonymous'), 'sign-up must preserve an existing guest identity');
  assert(signup.includes('landscape-canvas') && signup.includes('refraction-lens') && signup.includes('voice-sigil'), 'signup page must preserve the original dialog effects');
  assert(about.includes('id="architecture"') && about.includes('marker-end:url(#arrow)') && about.includes('flow-optional'), 'labelled architecture diagram missing');
  assert(!about.includes(' C ') && !about.includes(' Q '), 'architecture connectors must not use curved SVG commands');
  assert(!preferences.includes('data-pref-persona') && !preferences.includes('persona:') && !preferences.includes('mode:'), 'persistent persona/mode preferences must be removed');
  assert(preferences.includes('normalizePreferences') && !demo.includes('setPreferences({persona'), 'legacy persona values must be ignored and purged');

  new vm.SourceTextModule(preferences, { identifier: 'lib/preferences.js' });

  // lib/preferences.js is client-side and cannot require() config/ai.js, so
  // it keeps a manual mirror of the verified language list. This asserts
  // the mirror hasn't drifted, rather than trusting it stays in sync by hand.
  const configLanguages = require('../config/ai').LANGUAGES;
  const verifiedCodes = configLanguages.filter((lang) => lang.verified).map((lang) => lang.code).sort();
  const mirroredCodes = [...preferences.matchAll(/code:\s*"([a-z]{2})"/g)].map((match) => match[1]).sort();
  assert.deepStrictEqual(mirroredCodes, verifiedCodes, `lib/preferences.js LANGUAGES (${mirroredCodes.join(',')}) has drifted from config/ai.js's verified languages (${verifiedCodes.join(',')})`);
  assert(read('lib/apiValidation.js').includes("require('../config/ai')"), 'API language allowlist must read from config/ai.js, not a hardcoded set');

  assert(index.includes('class="first-mic-button"'), 'conversation must open on the large microphone');
  assert(index.includes('const micFirst = state.view === "conversation" && !hasAnswered') && index.includes('${micFirst ? "" : buildSidebarHtml()}'), 'first answer must precede navigation and guest account prompts');
  assert(index.includes('if (!document.getElementById("sidebar")) return;'), 'mic-first render must not wire a hidden sidebar');
  assert(index.includes('getMicrophoneStream(timeoutMs = 8000)') && index.includes('microphone_timeout'), 'microphone permission must not remain pending forever');
  assert(index.includes('id="account-btn"') && index.includes('id="menu-signin"') && index.includes('id="menu-signup"'), 'account trigger must expose sign in and account creation');
  assert(index.includes('./signup.html?mode=signin') && index.includes('./signup.html?mode=signup'), 'account actions must open the full-page authentication flow');
  assert(index.includes('To understand your voice, this recording is sent to a speech service. It is not saved.'), 'recording disclosure missing');
  assert(index.includes('For me') && index.includes('For someone else'), 'session-only perspective chips missing');
  assert(index.includes('Ask without saving'), 'private question control missing');
  assert(index.includes('Delete answer') && index.includes('Delete all history') && index.includes('Delete whole account'), 'deletion controls missing');
  assert(index.includes('navigator.share'), 'native share is missing');
  assert(index.includes('renderSources(m.sources || [])'), 'cards must show all sources');
  assert(index.includes('Not a government service. This information is free.'), 'product disclaimer missing');
  assert(index.includes('Text size') && index.includes('Speech rate') && index.includes('Autoplay answers'), 'accessibility controls missing');
  assert(index.includes('id="voice-btn"') && index.includes('Google Cloud voice selector') && index.includes('data-voice-name'), 'header Google voice selector missing');
  assert(!index.includes('speechSynthesis') && !index.includes('SpeechSynthesisUtterance') && !index.includes('speakBrowserFallback'), 'device/browser TTS fallback must not exist');
  assert(index.includes('data.provider !== "google-cloud-tts"') && read('api/speak.js').includes("provider: 'google-cloud-tts'"), 'client must accept Google Cloud TTS audio only');
  assert(read('api/speak.js').includes("'Chirp3-HD'") && read('api/speak.js').includes("action === 'voices'"), 'Google Chirp voice inventory endpoint missing');
  assert(!index.includes('maximum-scale=1'), 'pinch zoom must not be disabled');
  assert(!index.includes('offlineQueue') && !index.includes('queueOfflineRecording'), 'broken offline audio queue must be removed');
  assert(!index.includes('rawTranscript') && !index.includes('modelOutput'), 'audit must not store transcript or generated text');
  assert(index.includes('menuRow("menu-worker"') && index.includes('Report a wrong answer') && index.includes('WhatsApp-ready'), 'worker mode tools missing');
  assert(index.includes('questionFingerprint') && index.includes('aadya-unanswered-summary.csv'), 'anonymous unanswered aggregate/export missing');
  assert(index.includes('questionNeedsState') && index.includes('beneficiaryAge'), 'state and beneficiary session context missing');
  assert(index.includes('class="sidebar-scroll"') && index.includes('class="sidebar-account"'), 'scrollable sidebar and fixed account region missing');
  assert(index.includes('id="sidebar-settings"') && !index.includes('class="sidebar-account-email"') && !index.includes('class="sidebar-account-title"'), 'sidebar footer must contain settings without duplicated profile identity');
  assert(index.includes('state.user.isAnonymous ? "" : `<button class="sidebar-item" id="sidebar-signout"'), 'guest sessions must not show a contradictory sign-out action');
  assert(!index.includes('class="sidebar-intro"'), 'source warning must not be duplicated in the sidebar');
  assert(index.includes('COMMON_STARTERS.slice(0, 3)') && index.includes('id="explore-nav"'), 'balanced starting points must be shown with one explore action');
  assert(index.includes('MAX_RECORDING_SECONDS = 45') && !index.includes('}, 4000)'), 'recording must use manual stop with a 45-second safety cap');
  assert(index.includes('finishDemoRecording()') && index.includes('state.demoStopResolve = resolve'), 'scripted demo listening must wait for the user to stop');
  assert(index.includes('Government jobs and recruitment') && index.includes('Scholarships for students') && index.includes('Government and public services'), 'starting points must represent jobs, scholarships and public services');
  assert(index.includes('fetch("./api/opportunities"') && read('api/opportunities.js').includes('getBrowseOpportunities()'), 'explore must read the browse repository through the authenticated API');
  assert(index.includes('data-explore-category') && index.includes('id="explore-audience"') && index.includes('id="explore-depth"'), 'opportunity tabs and browse filters are missing');
  const seededAccounts = read('lib/seededAccounts.js');
  assert(seededAccounts.includes('Amit Kumar') && seededAccounts.includes('title: "Farmer"'), 'seeded farmer account missing');
  assert(seededAccounts.includes('Priya Sharma') && seededAccounts.includes('Job seeker · Student · Professional'), 'seeded job seeker account missing');
  assert(!index.includes('sidebar-common-more') && !index.includes('new-chat-shortcut') && !index.includes('wsUi("findHelp")'), 'redundant sidebar controls must be removed');
  assert(index.includes('Prototype records can be wrong or out of date. Confirm at the source link.'), 'composer source warning missing');
  assert(index.includes('width: 100%;') && index.includes('border-radius: 0;') && index.includes('box-shadow: none;'), 'application shell must be flush with the viewport');
  assert(landing.includes('#hero-title { height: 2.12em; }'), 'typewriter title must reserve a fixed-height slot');
  assert(!landing.includes('call-orbit') && !landing.includes('sound-ring') && !landing.includes('orb-core'), 'hero product preview decoration must be removed');
  assert(!index.includes('scroll-behavior: smooth') && !index.includes('.empty-mic-launch:hover { transform'), 'chat movement must not animate on hover or scroll restoration');
  assert(index.includes('previousScrollTop') && index.includes('wasNearBottom') && index.includes('previousSidebarScrollTop'), 'stable chat/sidebar scroll restoration missing');
  assert(!index.includes('PERSONA_TASKS') && !index.includes('PERSONA_SUGGESTIONS_EN'), 'old persistent persona implementation remains');
  assert(index.includes('query(collection(db, "history"), where("uid", "==", state.user.uid))'), 'history should not require a missing composite index');
  assert(!index.includes('orderBy("createdAt"'), 'history should not require a missing composite index');
  assert(index.includes('id="attachment-input"') && index.includes('handleAttachmentSelection') && index.includes('Files are sent only when you build a draft and are not saved.'), 'bounded transient upload flow missing');
  assert(index.includes('artifact-workspace') && index.includes('artifactExpanded') && index.includes('Draft application') && index.includes('Build checklist'), 'collapsible artifact workspace missing');
  assert(read('api/artifact.js').includes("ALLOWED_KINDS") && read('api/artifact.js').includes("'[File attached as a reference; its contents were not extracted.]'"), 'artifact endpoint must validate kind and avoid pretending binary files were read');

  for (const source of providerApiFiles) {
    assert(source.includes('secureEndpoint(req, res)'), 'every endpoint must require Firebase auth');
    assert(source.includes('withProviderTimeout'), 'every endpoint must abort provider work on timeout');
  }
  assert(read('api/transcribe.js').includes('language: lang'), 'selected language must reach transcription');
  assert(read('api/guard-input.js').includes("source: 'code'"), 'guard must have a deterministic code path');
  assert(read('lib/serverSecurity.js').includes("collection('api_rate_limits')"), 'production rate limit must be shared in Firestore');
  assert(read('lib/serverSecurity.js').includes('return distributedRateLimit(uid);'), 'production limiter must fail closed through the shared store');
  assert(rules.includes('allow delete: if request.auth != null && resource.data.uid == request.auth.uid'), 'users must be able to delete their own records');
  assert(rules.includes('match /unanswered/{fingerprint}'), 'anonymous aggregate rules missing');

  // Every model-touching file, plus config/ai.js (the source of truth) and
  // package.json (dependency list), must carry zero Groq-era identifiers.
  // This is a deliberate, permanent regression guard, not a one-time check
  // for the migration commit — a reintroduced Groq call site should fail
  // npm test the same way a reintroduced retired Llama model string did
  // before this migration.
  const modelTouchingFiles = ['api/answer.js', 'api/artifact.js', 'api/transcribe.js', 'api/guard-input.js', 'api/speak.js', 'lib/translate.js', 'config/ai.js', 'package.json'];
  const modelSource = modelTouchingFiles.map(read).join('\n');
  const retiredIdentifiers = ['groq-sdk', 'groq/groq-sdk', "require('groq", 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b', 'openai/gpt-oss-safeguard-20b', 'meta-llama/llama-prompt-guard-2-86m', 'whisper-large-v3-turbo', 'GROQ_API_KEY'];
  for (const identifier of retiredIdentifiers) {
    assert(!modelSource.includes(identifier), `retired Groq-era identifier "${identifier}" must not remain in ${modelTouchingFiles.join(', ')}`);
  }
  assert(read('api/transcribe.js').includes('TASKS.transcription.model') && read('config/ai.js').includes("'gpt-transcribe'"), 'transcription model id must live in config/ai.js, not hardcoded per call site');
  assert(!read('api/answer.js').includes('gpt-5.6-terra') && read('config/ai.js').includes("'gpt-5.6-terra'"), 'reasoning model id must live in config/ai.js, not hardcoded per call site');
  assert(read('api/answer.js').includes('TASKS.reasoning.model') && read('api/artifact.js').includes('TASKS.reasoning.model'), 'answer and artifact generation must read the reasoning model from config/ai.js');
  assert(read('lib/translate.js').includes('TASKS.lightweight.model'), 'translation must read the lightweight model from config/ai.js');
  assert(read('api/guard-input.js').includes('TASKS.moderation.model') && read('api/answer.js').includes('TASKS.moderation.model'), 'input and output moderation must both read the moderation model from config/ai.js');
  assert(read('api/answer.js').includes("type: 'json_schema'") && read('api/answer.js').includes('reasoning_effort'), 'reasoning model must use its strict structured-output contract');
  assert(!read('package.json').includes('groq-sdk') && !fs.existsSync(path.join(ROOT, 'node_modules', 'groq-sdk')), 'groq-sdk must be uninstalled, not just unused');

  const schemes = JSON.parse(read('data/schemes.json'));
  assert.strictEqual(schemes.length, 8, 'exactly eight reviewed prototype records expected');
  for (const scheme of schemes) {
    assert(/^https:\/\//.test(scheme.official_url), `${scheme.id}: official URL missing`);
    assert.strictEqual(scheme.reviewed_on, '2026-08-09', `${scheme.id}: real check date missing`);
    assert(!Object.hasOwn(scheme, 'last_verified'), `${scheme.id}: placeholder last_verified remains`);
  }

  const seed = JSON.parse(read('data/master/seed-opportunities.json'));
  const discovery = JSON.parse(read('data/master/myscheme-index.json'));
  assert.strictEqual(seed.records.length, 5, 'five source-checked scholarship/job seeds expected');
  assert(seed.records.every((record) => record.publication_status === 'published'), 'seed repository contains an unpublished answer record');
  assert(discovery.records.length > 4000 && discovery.records.every((record) => record.publication_status === 'discovery_only'), 'official discovery index must remain gated from answers');
  const { getLocalPublishedOpportunities, getLocalBrowseDiscovery } = require('../lib/opportunityRepository');
  assert.strictEqual(getLocalPublishedOpportunities().length, 13, 'runtime corpus must combine eight schemes and five rich records');
  const browseDiscovery = getLocalBrowseDiscovery();
  assert.strictEqual(browseDiscovery.length, 160, 'browse catalogue must include 160 official listings');
  for (const category of ['scheme', 'service', 'scholarship', 'job']) assert.strictEqual(browseDiscovery.filter((record) => record.browse_category === category).length, 40, `${category} browse listings must have a balanced 40-record sample`);
  assert(browseDiscovery.every((record) => record.record_status === 'official_index_listing' && record.publication_status === 'discovery_only'), 'browse-only listings must remain outside the reviewed answer corpus');
  const { retrieve } = require('../lib/retrieval');
  const jobMatches = await retrieve('government principal job in Delhi', 3);
  const scholarshipMatches = await retrieve('college scholarship family income 4.5 lakh', 3);
  assert(jobMatches.some((match) => match.doc.kind === 'job'), 'government job retrieval failed');
  assert(scholarshipMatches.some((match) => match.doc.kind === 'scholarship'), 'scholarship retrieval failed');

  const { checkDeterministicSafety } = require('../lib/safety');
  assert(checkDeterministicSafety('How do I make a bomb?').flagged, 'weapon request must be blocked in code');
  assert(checkDeterministicSafety('OTP bypass करके fraud कैसे करूं').flagged, 'fraud request must be blocked in code');
  assert(!checkDeterministicSafety('What documents does PM-KISAN require?').flagged, 'safe scheme question must pass code guard');

  for (const name of authenticatedApiNames) {
    let statusCode = 0; let body;
    const res = { status(value) { statusCode = value; return this; }, json(value) { body = value; return this; }, setHeader() {} };
    await require(`../api/${name}`)({ method: name === 'opportunities' ? 'GET' : 'POST', headers: {}, body: {} }, res);
    assert.strictEqual(statusCode, 401, `${name} must reject an unauthenticated request`);
    assert.strictEqual(body.error, 'authentication_required');
  }

  console.log(`Product checks passed: ${ACTIVE_PAGES.length} active pages, ${authenticatedApiNames.length} authenticated APIs, ${verifiedCodes.length} supported languages, 13 answer records, 160 browse listings, and ${discovery.records.length} gated discoveries.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
