# Provider history

Aadya ran on Groq from its initial build until the commit tagged
[`groq-final`](https://github.com/humansingh/aadya-voice/tree/groq-final),
which is the last commit with a fully working Groq implementation. This
table exists so a future switch (back to Groq, or to a third provider) has
a starting reference instead of spelunking through git history.
`config/ai.js` exposes `provider` per task group specifically as that seam;
reverting would mean checking out `groq-final`'s version of the affected
call site as a deliberate refactor, not flipping a config value — the two
providers' SDKs and response shapes are not interchangeable at the code
level.

| Task group | Groq model | Replaced by | Why |
| --- | --- | --- | --- |
| Transcription | `whisper-large-v3-turbo` | `gpt-transcribe` | Model stack decision: committed-turn transcription on the OpenAI platform, consolidating provider billing under the $50 OpenAI budget instead of splitting it across two providers. |
| Reasoning (`api/answer.js`, `api/artifact.js`) | `openai/gpt-oss-120b` | `gpt-5.6-terra` | Locked model stack. Terra is reserved for anything where a wrong output could cost someone a benefit they are entitled to: eligibility reasoning, answer cards, application drafts. Never Luna for these. |
| Lightweight (`lib/translate.js`, lexical query expansion) | `openai/gpt-oss-120b` | `gpt-5.6-luna` | Same locked stack. Luna handles non-safety-critical text shaping — here, translating a query for retrieval, never the answer the user reads. Cheaper and faster than Terra. |
| Moderation, input pre-flight (`api/guard-input.js`) | `meta-llama/llama-prompt-guard-2-86m` (a jailbreak/prompt-injection probability classifier) | `omni-moderation-latest` | The final model stack has no dedicated jailbreak classifier — one moderation model covers both input and output. This is a real behavior change, not a like-for-like swap: Prompt Guard scored injection likelihood specifically, `omni-moderation-latest` flags policy-violating content categories (harassment, violence, self-harm, etc.). The two are not measuring the same thing. |
| Moderation, output gate (`api/answer.js`) | `openai/gpt-oss-safeguard-20b`, called via Groq, and non-blocking (logged only, never withheld an answer — see the commit that made it a blocking gate) | `omni-moderation-latest` | Same model now serves both the pre-flight and the output gate. The gate itself became blocking in an earlier commit, before this provider migration. |
| Embeddings (retrieval) | none — retrieval was keyword-overlap scoring in `lib/retrieval.js`, no embedding model of any provider was ever called | `text-embedding-3-large` | Not a swap, a new capability. Embeddings-based retrieval did not exist before this migration and lands in a separate commit: the ~173-record corpus is embedded offline and cached, only the query is embedded at runtime, brute-force cosine similarity across the small in-memory corpus. |
| Speech (text-to-speech) | never Groq | Google Cloud TTS, unchanged | Deliberately not an OpenAI model. Was already working, is billed separately from the OpenAI budget, and covers all seven supported languages with a consistent Chirp3-HD voice set. |

Unaffected by this migration: the deterministic keyword-based safety floor
in `lib/safety.js` runs in code, not through any model provider, and
applies before both the input pre-flight and the server-side re-check in
`api/answer.js` / `api/artifact.js` regardless of which model provider is
behind the moderation call.
