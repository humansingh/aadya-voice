# Aadya production readiness audit

Status: **not yet approved for a 10,000-user public launch**.

The product experience is substantially beyond a prototype, but a public-services voice tool has higher release requirements than a normal content application. The open P0 gates below can affect cost, privacy, access control, or the accuracy of guidance people carry to an office.

## Fixed in this product pass

- Easy mode now has a separate warm-white/charcoal interface, visible foreground/background hierarchy, yellow selected states, and green reserved for primary actions and success.
- The Easy/Detailed control keeps the same fixed height in both states.
- Onboarding progress controls have equal dimensions; active state never changes shape.
- Language choices show full language names and keep the selection across all active pages.
- Speech recognition and demo scenarios no longer overwrite the selected language.
- The onboarding mode preview uses fixed layout rows and cannot overlap its labels.
- The landing product-tour nodes share the available height and use balanced top/bottom padding.
- Request bodies now have size limits, supported audio types are checked, text inputs are bounded, provider error detail is not returned to clients, and the local server adds defensive response headers and a development rate guard.
- The integrations page distinguishes ready product patterns from adapters and intentionally unsupported actions.

## P0 gates before public launch

| Gate | Current state | Release requirement |
| --- | --- | --- |
| Scheme accuracy | All eight prototype records were checked against their stored official sources on 2026-08-09 and carry a check date. They still need ongoing ownership because rules change. | Assign a content owner, define an expiry/review SLA, and recheck every record before its review window expires. |
| Admin access | Code and rules now require a server-issued `admin: true` claim; rule deployment and claim provisioning are not evidenced here. | Provision claims through a trusted server, deploy the rules, test deny/allow cases with the emulator and record evidence before storing real user turns. |
| API abuse and cost | All endpoints verify Firebase identity and production rate limits are shared per user in Firestore. | Add provider budget alerts, bot protection and a kill switch at the production edge; load-test the configured quota. |
| Authentication | Firebase guest and email/password flows are implemented, including sign-up and password reset. | Enable abuse protection and test account recovery and session revocation in the production project. |
| Privacy | Recording disclosure, private questions, scoped deletion and minimized audit fields are implemented. A formal retention contract is still absent. | Define retention periods, encrypt and restrict exports, and complete a privacy review. |
| Reliability | No representative 10,000-user load result exists. | Load test expected peak concurrency, not just total users; test provider throttling, timeouts, retry budgets, degraded text-only operation and recovery. |
| Observability | The audit UI exists, but launch SLOs and alerts are not defined. | Measure transcription, answer and TTS success/latency by language; alert on error, refusal, fallback and cost-rate changes without exposing raw personal data. |
| Accessibility | Keyboard/focus, large controls and responsive layouts exist. | Complete WCAG 2.2 AA audit, screen-reader testing and moderated testing with older, low-literacy and first-time smartphone users in each supported script. |
| Model quality | Guarding and grounded tiers exist; the replacement answer model passed a live structured-output smoke test. | Maintain Hindi/English evaluation sets, set launch thresholds by tier/language, and show a controlled degraded state on provider failure. |
| Incident response | Not documented. | Name an owner, severity policy, rollback/disable procedure, user notice flow, content correction path and provider/key rotation procedure. |

## Load-test acceptance targets

Choose the actual concurrency model from expected usage before running the test. A useful first release gate is:

- 30-minute steady test plus a 10-minute 3× spike.
- p95 text-answer latency below 8 seconds and p95 TTS completion below 5 seconds, measured separately by language.
- At least 99% successful non-provider-error responses under steady load.
- No cross-user history or audit leakage.
- Rate limits return a clear retry state and never create duplicate history entries.
- When Google Cloud TTS fails, readable text remains available, the failure is visible, and the next question is not blocked.
- When the main model is unavailable, the product shows a controlled degraded state unless the fallback has passed the same quality threshold.

## Persona release checks

Test at minimum: independent citizen, farmer, student, senior with low digital confidence, family caregiver, CSC operator, ASHA/Anganwadi worker, and NGO field worker. Each test should cover first setup, changing language, one successful record match, one partial match, one general-guidance answer, correcting a transcript, replaying audio, finding saved guidance, and recognizing that Aadya has not made an eligibility decision.

Launch approval should be recorded only after every P0 gate has an owner, evidence link and sign-off date.
