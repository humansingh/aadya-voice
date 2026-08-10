# Sahayak master repository and retrieval architecture

## What exists now

The repository deliberately separates **discovery** from **answering**:

- `data/master/myscheme-index.json` is a 4,339-record discovery index synced from the official myScheme eligibility engine on 9 August 2026. It is useful for finding candidates, deduplication and scheduling research. These records are `discovery_only` and must never be supplied to the answer model as factual evidence.
- `data/schemes.json` contains eight source-checked prototype scheme records.
- `data/master/seed-opportunities.json` contains three source-checked scholarships and two current government job notices.
- `data/master/source-registry.json` is the approved official-source catalogue and refresh schedule.
- `lib/opportunityRepository.js` normalises the 13 publishable records into one canonical interface.
- `lib/retrieval.js` retrieves only `publication_status=published` records. `api/answer.js` sends the matching evidence to the generation model and returns all retrieved sources to the answer card.

This prevents an official directory title from being mistaken for verified eligibility, benefit or deadline data.

## Firestore collections

| Collection | Role | Important fields |
|---|---|---|
| `opportunities/{id}` | Denormalised, current read model queried by the API | `kind`, `publication_status`, `application_status`, `title`, `aliases`, `government_entity`, `geography`, `eligibility_text`, `benefits`, `documents_required`, `application`, `contacts`, `sources` |
| `opportunity_versions/{opportunityId__date}` | Immutable source-checked snapshot for audit and rollback | full opportunity snapshot, `opportunity_id`, source check dates |
| `opportunity_chunks/{opportunityId__section}` | Retrieval units, later suitable for vector embeddings | `opportunity_id`, `section`, `language`, `text`, `source_url`, `checked_on`, `embedding_status`, later `embedding` and `embedding_model` |
| `sources/{sourceHash}` | Deduplicated official evidence | URL, title, publisher, check date, primary flag |
| `ingestion_sources/{id}` | Official source registry | scope, types, ingestion method, cadence and source-specific caveats |
| `ingestion_runs/{id}` | Import/sync monitoring | status, counts, timestamps, errors |
| `corrections/{id}` | User-reported wrong-answer queue | existing minimal correction fields; no raw transcript |

Eligibility rules and contact rows are nested in the read model because they are normally fetched with the opportunity. They are repeated in the workbook as separate tables for editing and validation. If contacts later become shared across hundreds of notices, introduce `entities/{id}` and `contacts/{id}` and store stable references in each opportunity; do not do that before the duplication exists.

## Canonical opportunity fields

Every opportunity has a stable ID, kind (`scheme`, `scholarship`, `scholarship_portal`, or `job`), publication and application status, title and aliases, three type-specific description slots, government entity, India geography down to pincode when stated, eligibility prose and machine-testable rules, exclusions, benefits, expectations or duties, document checklist, application method and dated window, official contacts, sources and source check dates.

Blank means “not published in the checked source,” never “not applicable” unless explicitly stated. Personal contact names are stored only when an official government notice publishes them in that role.

## Publication and expiry workflow

```text
discovered -> extracted -> needs_review -> published -> stale/expired -> archived
```

Only `published` records enter retrieval. A job or scholarship application window can become `closed` without deleting the source record. Scheduled refreshes must check active jobs daily, scholarship notices weekly during admission seasons, and stable scheme guidelines monthly or when a notification changes. A corrigendum creates a new immutable version and updates the current read model.

## Query path

```text
voice -> transcription -> English retrieval query -> publication gate
      -> lexical/hybrid retrieval -> evidence-only generation -> answer card -> Google Cloud TTS
```

Today the corpus is small enough for deterministic weighted retrieval. The chunk collection is ready for cross-language embeddings once a measured retrieval evaluation justifies them. At larger scale, retrieve candidates by vector similarity, then apply hard metadata filters for kind, state, deadline and publication status and rerank. Generation never receives discovery-only records.

## Firebase import and runtime switch

The import is dry-run by default:

```bash
npm run data:import:firestore
```

To write, select the intended Firebase project and provide a server credential through `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS`, then run:

```bash
npm run data:import:firestore -- --apply
```

Deploy `firestore.rules` and `firestore.indexes.json`, then set `OPPORTUNITY_SOURCE=firestore` in the server environment. Without that switch the API uses the identical bundled source-checked seed, so migration and rollback are reversible. Client writes to all master-data collections are denied.

## Scale and data quality rules

- Keep the current opportunity denormalised to avoid multiple reads per voice turn; retain immutable versions separately.
- Index `publication_status + kind + application.deadline` and `publication_status + geography.state + kind`.
- Cache the Firestore published corpus for five minutes per server instance. Add a shared retrieval-result cache only after measuring repeated queries.
- Do not embed deadlines, contacts or status as the only copy of those facts. Keep structured fields for filtering and use chunks only for semantic recall.
- Never infer missing deadlines, amounts, pincodes, contacts or eligibility conditions.
- NCS listings count as government jobs only when the employer is a government entity and an originating official notice is stored.
- NSP has no universal scholarship deadline; each scheme and academic year needs its own notice.
- Any record whose source is unreachable or older than its refresh policy becomes `stale` and is excluded until checked.
