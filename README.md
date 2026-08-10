# Aadya

Aadya listens first. A voice assistant that helps people ask about government schemes and entitlements in their own language, and get an answer they can trust and act on.

## Try it

- Live deployment: not linked here yet, ask for the current Vercel URL before sharing this repo further.
- Guided demo (no microphone, no model calls, safe to present live): `/demo.html`
- Full app with a scripted mic queue: `/index.html?demo=1`
- Source: [github.com/humansingh/aadya-voice](https://github.com/humansingh/aadya-voice)

## What this is

Aadya accepts a spoken or typed question in Hindi or English, checks it against a small, source-checked repository of Indian government schemes, scholarships, jobs and services, speaks back a grounded answer, and turns that answer into a document-and-office checklist a person can carry. It does not decide eligibility and does not represent any government body. Every answer states the published criteria and points to the official source and office to confirm in person.

## Product surfaces

| Page | Purpose |
| --- | --- |
| `landing.html` | Product story, headless demo preview and interactive provider-cost estimate. Served at `/`, the default entry point |
| `signup.html` | Full-page Firebase account creation, sign-in, password reset and guest continuation |
| `about.html` | Product boundaries, end-to-end architecture diagram and current stack |
| `demo.html` | Deterministic, animated voice-to-evidence product tour with no microphone or model calls |
| `index.html` | Sign-in and the full voice workspace; add `?demo=1` for scripted local responses |
| `integrations.html` | Three integration patterns plus a clear can/cannot capability matrix |

## Run locally

Requirements: Node.js 18 or newer.

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000/](http://localhost:3000/). The local server serves both the static pages and the handlers in `api/`, so no deployment CLI is required.

Useful local URLs:

```
http://localhost:3000/demo.html               guided tour, no mic or model calls
http://localhost:3000/index.html?demo=1        full app, scripted responses
http://localhost:3000/signup.html              create an account
http://localhost:3000/about.html               architecture and current stack
http://localhost:3000/integrations.html        integration patterns
```

Authentication is real Firebase email/password or an anonymous Firebase guest. There is no mock credential path. Demo mode (`?demo=1`) bypasses every provider call and the microphone, so it is deterministic and safe for screen recordings.

## Environment

Keys live in Vercel project settings for the deployed app, never in this repository. `.env.example` lists every variable with a placeholder; copy it to `.env` for local development.

| Variable | Purpose |
| --- | --- |
| `GROQ_API_KEY` | Transcription, translation and answer/artifact generation (current provider, mid-migration to OpenAI; see Request flow below) |
| `GOOGLE_TTS_API_KEY` | Google Cloud Text-to-Speech, used by `api/speak.js` |
| `OPENAI_API_KEY` | Output moderation (`omni-moderation-latest`), blocking gate in `api/answer.js` |
| `MODERATION_FAIL_MODE` | `open` (default) or `closed`; what happens if the moderation call itself fails |
| `FIREBASE_PROJECT_ID` | Firebase project id, used for ID-token verification |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server-side Firebase Admin credential, one-line JSON |
| `OPPORTUNITY_SOURCE` | `local` or `firestore`; which repository the API reads from |
| `API_RATE_LIMIT_PER_MINUTE` | Per-user request ceiling, enforced in Firestore in production |
| `PROVIDER_TIMEOUT_MS` | Hard timeout on every outbound provider call |

`GOOGLE_APPLICATION_CREDENTIALS` (a path to a service-account key file) is an accepted alternative to `FIREBASE_SERVICE_ACCOUNT_JSON` for local development; see `lib/serverSecurity.js`.

## Request flow

This section describes the current code and needs updating once the OpenAI-platform migration (transcription, embeddings, reasoning and lightweight tasks moving off Groq) lands.

1. The browser records or types a question and calls `POST /api/transcribe` (Firebase-authenticated) if it was spoken. Groq Whisper Large V3 Turbo returns the transcript.
2. The client calls `POST /api/guard-input` as a pre-flight UX check: a deterministic keyword floor, then a Groq jailbreak/injection classifier.
3. The client calls `POST /api/answer`. The same deterministic safety check runs again server-side, so a direct call to this endpoint cannot skip it. The question is translated to English if needed, matched against the local retrieval corpus, and sent to Groq for a tiered, structured-JSON answer. The generated answer is then passed through a blocking OpenAI `omni-moderation-latest` check before it is returned; a flagged answer is replaced with a redirect, never sent to the user.
4. The client calls `POST /api/speak` to synthesize the answer with Google Cloud Text-to-Speech.
5. Optionally, `POST /api/artifact` turns a question and answer into an application draft or document checklist, gated by the same deterministic safety check.
6. `GET /api/opportunities` serves the browse/directory catalogue directly from Firestore or the local repository; no model call is involved.

See `about.html` for the full visual diagram of this flow, including identity and storage.

## Data status

Two different counts describe two different things:

- **19 records** in the retrieval corpus that grounds answers: 13 source-checked opportunities (schemes, scholarships, jobs) plus 6 general-context records used for Tier 3 guidance. This is what `lib/retrieval.js` searches.
- **173 records** in the browse/directory catalogue served by `GET /api/opportunities`: the same 13 opportunities plus 160 myScheme discovery-only listings. Discovery-only listings are titles and links only; they are never sent to the answer model as evidence, see [`docs/DATA_ARCHITECTURE.md`](docs/DATA_ARCHITECTURE.md).

The full myScheme index behind the discovery layer holds 4,339 records, gated as `discovery_only` until a record passes a source check. Ingestion sources and their refresh cadence are catalogued in [`data/master/source-registry.json`](data/master/source-registry.json).

## Verification

```bash
npm test
```

Runs `scripts/test-product.js`: source-level assertions across every active page and API handler (module scripts parse, authenticated endpoints require identity, deleted code paths stay deleted, record counts match the data files). It does not call any model provider.

`scripts/test-tiers.js` is a manual, live smoke test that sends a mix of English and Hindi questions to a running instance and reports which retrieval tier each one lands in. It is not part of `npm test`; run it with `node scripts/test-tiers.js` against a server pointed to by its `SAHAYAK_URL` environment variable.

## Structure

```
api/            Vercel serverless functions (transcription, guard, answer, artifact, speak, opportunities)
lib/            Shared server and client logic: retrieval, safety, i18n, Firebase, preferences
data/           Source-checked opportunity records and the myScheme discovery index
docs/           Architecture notes
scripts/        Local dev server, data import/sync tooling, tests
*.html          Static pages: app, landing, about, demo, integrations, signup
```

## Known limitations

This is a hackathon prototype, not a launched product. [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md) is not approved for a public launch and lists the open gates: content ownership and refresh, admin access provisioning, load testing, incident response and more.

The scheme dataset is a small, hand-checked prototype set, not a complete or continuously synced picture of Indian government schemes. Aadya does not make a final eligibility decision for anyone; it states the published criteria and tells the user what to confirm, and where, in person.

## Built with

- [Vercel](https://vercel.com) (hosting)
- [GitHub](https://github.com) (source)
- [Firebase](https://firebase.google.com) Auth and Firestore (authentication, history, opportunity store)
- [Google Cloud Text-to-Speech](https://cloud.google.com/text-to-speech) (speech output)
- [OpenAI Platform](https://platform.openai.com) (transcription, embeddings, reasoning, moderation)
- [Groq](https://groq.com) (previous provider for transcription and reasoning; see `docs/PROVIDER-HISTORY.md` once the migration commit lands)
- Claude Code (development)
- Codex (development)
