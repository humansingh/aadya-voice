# Sahayak — local-language voice utility agent

Sahayak is a local-first voice help desk for Indian public schemes and services. It accepts natural questions, checks a small prototype scheme repository, explains the supported result, speaks it back in the selected language, and turns it into a practical document-and-office checklist.

The conversation opens directly on a large microphone with guest access. English and Hindi are the only supported languages; other languages remain out of the interface until their voice paths pass a representative evaluation. Language and accessibility preferences are stored locally. The “For me” / “For someone else” choice is session-only and is never stored on a shared device.

## Product surfaces

| Page | Purpose |
| --- | --- |
| `landing.html` | Product story, headless demo preview and interactive provider-cost estimate |
| `signup.html` | Full-page Firebase account creation, sign-in, password reset and guest continuation |
| `about.html` | Product boundaries, end-to-end architecture diagram and current stack |
| `demo.html` | Deterministic, animated voice-to-evidence product tour with no microphone or model calls |
| `index.html` | Sign-in and the full voice workspace; add `?demo=1` for scripted local responses |
| `integrations.html` | Three integration patterns plus a clear can/cannot capability matrix |
| `audit.html` | Admin-facing evidence and turn audit view |

## Run locally

Requirements: Node.js 18 or newer.

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000/](http://localhost:3000/). The local server serves both static files and the handlers in `api/`; no deployment CLI is required.

Useful local URLs:

- Guided tour: [http://localhost:3000/demo.html](http://localhost:3000/demo.html)
- Full scripted app: [http://localhost:3000/index.html?demo=1](http://localhost:3000/index.html?demo=1)
- Create an account: [http://localhost:3000/signup.html](http://localhost:3000/signup.html)
- Architecture: [http://localhost:3000/about.html](http://localhost:3000/about.html)
- Integrations: [http://localhost:3000/integrations.html](http://localhost:3000/integrations.html)

Authentication is real Firebase email/password or an anonymous Firebase guest. There is no mock credential path. Demo mode bypasses Groq and microphone capture, so it is suitable for deterministic walkthroughs and screen recordings.

## Environment

Copy `.env.example` to `.env` and replace only the values you intend to exercise:

```dotenv
GROQ_API_KEY=REPLACE_ME
GOOGLE_TTS_API_KEY=REPLACE_ME
FIREBASE_PROJECT_ID=REPLACE_ME
FIREBASE_SERVICE_ACCOUNT_JSON=REPLACE_WITH_ONE_LINE_JSON
```

- `GROQ_API_KEY` supports transcription, input guarding and grounded answers.
- `GOOGLE_TTS_API_KEY` enables server-rendered speech. The header voice selector offers live-validated Google Chirp 3 HD and Neural2 choices for Hindi and Indian English; Chirp 3 HD is the default. Device/browser speech synthesis is not used, and Google failures remain visible while the answer stays readable.
- Production API authentication and the shared per-user rate limiter require Firebase Admin credentials through `FIREBASE_SERVICE_ACCOUNT_JSON` (or Application Default Credentials) and `FIREBASE_PROJECT_ID`.

Restrict the Google key to the Cloud Text-to-Speech API. Keep both keys server-side and out of committed files. If a real key has ever appeared in a chat, recording, shared screen or repository history, rotate it before using the live pipeline.

## Request flow

```text
Voice or typed question
  -> /api/transcribe (Groq Whisper, when audio is used)
  -> /api/guard-input (prompt guard)
  -> lib/opportunityRepository.js (published-only repository gate)
  -> lib/retrieval.js (weighted retrieval across schemes, scholarships and jobs)
  -> /api/answer (grounded answer + output safeguard)
  -> confidence, sources, checklist and next office
  -> /api/speak (Google Cloud TTS)
  -> Google Cloud MP3 playback only
```

All provider calls are made by server handlers. The browser never receives the API keys.

## Verification

```bash
npm test
```

The product check parses every active page module and checks the supported language options, shared controls, demo routes, scroll stability, publication gate and scheme/scholarship/job retrieval.

## Master repository and Firestore

The editable workbook at `outputs/sahayak-master-repository/sahayak_government_opportunities_master.xlsx` contains a flat master view, normalized eligibility/documents/contacts/sources, a source registry, field dictionary, formula-driven quality checks and a 4,339-title official myScheme discovery queue. The answer API currently uses 13 source-checked published records: eight schemes, three scholarships and two government jobs. Discovery-only rows are deliberately excluded from answers until they are enriched and source checked.

Refresh the official discovery index with:

```bash
npm run data:sync:myscheme
```

Preview the Firestore import without writing:

```bash
npm run data:import:firestore
```

After choosing the intended Firebase project and providing Firebase Admin credentials, import with `npm run data:import:firestore -- --apply`, deploy `firestore.rules` and `firestore.indexes.json`, then set `OPPORTUNITY_SOURCE=firestore` on the server. See `docs/DATA_ARCHITECTURE.md` for the collections, indexes, versioning and publication workflow. See `docs/RESEARCH_HANDOFF_PROMPT.md` for the state-by-state research prompt.

## Firebase and audit access

Live authentication and persistent history use the configuration in `lib/firebaseClient.js`. For a live Firebase setup:

1. Enable Anonymous and Email/Password authentication.
2. Enable Firestore and add the web configuration to `lib/firebaseClient.js`.
3. Issue the Firebase custom claim `admin: true` from a trusted server for audit users.
4. Apply `firestore.rules` through the Firebase console or CLI and test deny/allow cases.

Audit authorization uses a Firebase custom claim and server-enforced Firestore rules. Claim provisioning and rule deployment still need release evidence.

The complete 10,000-user release gate audit is in [`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md). The repository should not be treated as approved for public launch until every P0 gate there has evidence and an owner.

## Trust and data status

The source-checked runtime corpus currently contains eight prototype scheme records plus three scholarship and two government-job records. PM-KISAN, Ayushman Bharat PM-JAY, PMAY-G, MGNREGA, National Scholarship Portal, Sukanya Samriddhi, Ujjwala and NSAP old-age pension remain the scheme seed.

The records are a small prototype dataset reviewed against the source URLs stored with each record. Amounts, deadlines, documents and eligibility rules can change; users must confirm important details at the linked source before relying on an answer.

Sahayak intentionally separates three answer states: strong record match, partial match that needs confirmation, and general guidance outside the repository. It does not make final eligibility decisions.

## Main structure

```text
api/                    local server handlers
assets/product.css      shared fonts, preferences and Easy-mode behavior
data/schemes.json       prototype scheme seed repository
data/master/            rich opportunity seed, source registry and discovery index
lib/opportunityRepository.js  normalized local/Firestore repository adapter
lib/retrieval.js        published-only weighted retrieval
lib/preferences.js      language and accessibility preferences only
lib/demoFixtures.js     deterministic full-app demo responses
scripts/dev-server.js   dependency-light local server
scripts/test-product.js cross-page product checks
scripts/import-opportunities-firestore.js  dry-run-first Firestore importer
docs/DATA_ARCHITECTURE.md scalable data and retrieval design
PRODUCTION_READINESS.md launch blockers, acceptance targets and persona checks
```

`npm run dev:vercel` remains available only as an optional compatibility path. Local testing and product development use `npm run dev`.
