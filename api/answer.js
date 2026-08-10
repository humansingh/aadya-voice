const Groq = require('groq-sdk');
const OpenAI = require('openai');
const { retrieve } = require('../lib/retrieval');
const { translateToEnglish } = require('../lib/translate');
const { getStrings } = require('../lib/i18n');
const { cleanText, cleanLanguage } = require('../lib/apiValidation');
const { secureEndpoint } = require('../lib/serverSecurity');
const { withProviderTimeout } = require('../lib/providerTimeout');
const { checkDeterministicSafety } = require('../lib/safety');

const MAIN_MODEL = 'openai/gpt-oss-120b';
// Keep the existing retry path unchanged during the emergency model swap.
// Both deprecated Llama identifiers now resolve to Groq's documented 120B
// replacement, so a 429 retry uses the same model rather than silently
// lowering answer quality.
const FALLBACK_MODEL = 'openai/gpt-oss-120b';
// Hardcoded here as a temporary bridge — both move into config/ai.js's
// `moderation` task group once that module lands.
const MODERATION_MODEL = 'omni-moderation-latest';
// open: a moderation-call failure serves the answer anyway, logs it, and
// flags moderation_skipped on the response — a transient OpenAI blip
// shouldn't take the app down during a public trial or live demo.
// closed: a moderation-call failure blocks the response (503).
const MODERATION_FAIL_MODE = (process.env.MODERATION_FAIL_MODE || 'open').toLowerCase() === 'closed' ? 'closed' : 'open';

// Retrieval-score cutoffs that decide the base tier before generation.
// Tuned against data/schemes.json's keyword-overlap scoring (0-1 range).
const TIER1_THRESHOLD = 0.35; // strong match — answer directly and specifically
const TIER2_THRESHOLD = 0.12; // some overlap — answer partially, name the gap
const ANSWER_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'aadya_answer',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        answer: { type: 'string' },
        sourceIds: { type: 'array', items: { type: 'string' } },
        gap: { type: 'string' },
        refuse: { type: 'boolean' },
      },
      required: ['answer', 'sourceIds', 'gap', 'refuse'],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `You are a careful public-services assistant for rural and semi-urban India.

You will be told which TIER applies to this turn. Follow the matching rules exactly.

TIER 1 (grounded): Strong match found in RETRIEVED DOCUMENTS. Answer directly and specifically using only those documents. Name the scheme.
TIER 2 (partial): Some related material in RETRIEVED DOCUMENTS, but it does not fully cover the question. Answer with what IS known from the documents, then state the specific gap in one short sentence (put this in "gap"), and suggest a next step (e.g. contact the helpline).
TIER 3 (general): RETRIEVED DOCUMENTS is empty or unrelated. Answer usefully from general knowledge of how Indian public services work — where this category of question is normally handled, what documents are usually involved, who to ask. Do not invent specific scheme names, amounts, or eligibility rules you don't actually know.

HARD RULES — never break these, in any tier:
1. NEVER state a definitive eligibility verdict ("you are eligible" / "you qualify"). State the published criteria plainly and tell the user what to carry to verify in person. Use phrasing like "the published criteria are..." — never "you are eligible."
2. Keep the answer short (3-5 sentences), plain language, suitable to be read aloud. The first sentence must be the plain result or next action, with no preamble.
3. Respond in the SELECTED LANGUAGE supplied with the question: use Hindi in Devanagari for "hi" and simple English for "en", even when the user code-switches or types a scheme name in another script.
4. Set "refuse": true ONLY for genuinely out-of-domain requests — medical diagnosis, legal advice, or anything harmful/unsafe. Do NOT refuse just because retrieval found nothing; that's Tier 3, not a refusal. When refusing, leave "answer" empty.
5. Expand every acronym on first use. Never output unexplained forms such as CSC, BPL, SECC, OTP, EPIC, or KCC.

Respond ONLY with strict JSON, no markdown fences, matching exactly:
{"answer": string, "sourceIds": string[], "gap": string, "refuse": boolean}`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const identity = await secureEndpoint(req, res);
  if (!identity) return;
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not set on server' });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not set on server' });
  }

  const t0 = Date.now();
  try {
    const { question: rawQuestion, language, perspective: rawPerspective, state: rawState, beneficiaryAge: rawBeneficiaryAge } = req.body || {};
    const question = cleanText(rawQuestion, 1200);
    if (!question) return res.status(400).json({ error: 'question must be 1-1200 characters' });
    const lang = cleanLanguage(language);
    const perspective = rawPerspective === 'other' ? 'other' : 'self';
    const userState = cleanText(rawState, 80);
    const beneficiaryAge = Number.isInteger(Number(rawBeneficiaryAge)) && Number(rawBeneficiaryAge) >= 0 && Number(rawBeneficiaryAge) <= 120 ? Number(rawBeneficiaryAge) : null;
    const strings = getStrings(lang);

    // Deterministic, auditable floor — runs server-side before any model
    // call reaches this endpoint. /api/guard-input runs the same check
    // (plus a model classifier) as a client-side pre-flight for UX, but a
    // direct POST here must not be able to skip it.
    const deterministic = checkDeterministicSafety(question);
    if (deterministic.flagged) {
      console.warn(`[answer] blocked by deterministic safety check: ${deterministic.category}`);
      return res.status(200).json({
        answer: strings.redirect,
        sourceIds: [],
        tier: 'refuse',
        tierLabel: null,
        confidence: 0,
        gap: null,
        chips: strings.redirectChips,
        retrievedDocIds: [],
        disclaimer: strings.disclaimer,
        timings: { translateMs: 0, retrieveMs: 0, generateMs: 0 },
      });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const openai = new OpenAI();

    // --- Translate + retrieve ---
    const englishQuery = await translateToEnglish(groq, question, lang);
    const tTranslate = Date.now();

    const matches = await retrieve(englishQuery, 5);
    const topScore = matches[0]?.score || 0;
    const tRetrieve = Date.now();

    const directoryOnly = matches.length > 0 && matches.every((match) => match.doc.kind === 'official_directory');
    const baseTier = directoryOnly ? 2 : topScore >= TIER1_THRESHOLD ? 1 : topScore >= TIER2_THRESHOLD ? 2 : 3;

    console.log(`[answer] lang=${lang} score=${topScore.toFixed(3)} tier=${baseTier} chars=${question.length}`);

    const context = matches.length
      ? matches
          .map((m) => `Source ID: ${m.doc.id}\nType: ${m.doc.kind}\nTitle: ${m.doc.title}\nGovernment entity: ${m.doc.government_entity?.name || 'not recorded'}\nLocation: ${[m.doc.geography?.city, m.doc.geography?.state, m.doc.geography?.scope].filter(Boolean).join(', ') || 'India'}\nDescription: ${m.doc.description_en}\nEligibility: ${(m.doc.eligibility || []).join('; ')}\nExclusions: ${(m.doc.exclusions || []).join('; ') || 'See eligibility criteria'}\nBenefits: ${(m.doc.benefits || []).join('; ') || 'See official source'}\nExpectations or duties: ${(m.doc.expectations || []).join('; ') || m.doc.job_description || 'Not applicable'}\nDocuments required: ${(m.doc.documents_required || []).join(', ')}\nApply at: ${m.doc.where_to_apply || 'See official source'}\nApplication deadline: ${m.doc.application?.deadline || m.doc.application?.deadline_note || 'No current deadline recorded'}\nSource: ${m.doc.official_url}\nRecord checked: ${m.doc.reviewed_on || 'not recorded'}`)
          .join('\n\n')
      : '(none)';

    // --- Generation ---
    const generationMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `TIER: ${baseTier}\nPERSPECTIVE: ${perspective === 'other' ? 'The user is helping someone else; use they/the beneficiary, not you.' : 'The user is asking for themself; use you.'}\nSESSION STATE: ${userState || 'not provided'}\nBENEFICIARY AGE: ${beneficiaryAge ?? 'not provided'}\nWhen a figure varies by state, say that plainly and use the provided state only when the retrieved record supports it.\n\nRETRIEVED DOCUMENTS:\n${context}\n\nUSER QUESTION (language: ${lang}): ${question}`,
      },
    ];

    let completion;
    let modelUsed = MAIN_MODEL;
    try {
      completion = await withProviderTimeout((signal) => groq.chat.completions.create({
        model: MAIN_MODEL, temperature: 0.2, reasoning_effort: 'low', max_completion_tokens: 1200, response_format: ANSWER_RESPONSE_FORMAT, messages: generationMessages,
      }, { signal }));
    } catch (err) {
      if (err?.status === 429) {
        console.warn(`[answer] ${MAIN_MODEL} rate-limited, falling back to ${FALLBACK_MODEL} (testing only)`);
        modelUsed = FALLBACK_MODEL;
        completion = await withProviderTimeout((signal) => groq.chat.completions.create({
          model: FALLBACK_MODEL, temperature: 0.2, reasoning_effort: 'low', max_completion_tokens: 1200, response_format: ANSWER_RESPONSE_FORMAT, messages: generationMessages,
        }, { signal }));
      } else {
        throw err;
      }
    }
    const tGenerate = Date.now();

    let parsed;
    try {
      const raw = completion.choices[0].message.content.trim().replace(/^```json|```$/g, '');
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = { answer: '', sourceIds: [], gap: '', refuse: false };
    }

    // Genuinely out-of-domain / harmful — warm redirect, never a dead end.
    if (parsed.refuse) {
      return res.status(200).json({
        answer: strings.redirect,
        sourceIds: [],
        tier: 'refuse',
        tierLabel: null,
        confidence: topScore,
        gap: null,
        chips: strings.redirectChips,
        retrievedDocIds: matches.map((m) => m.doc.id),
        disclaimer: strings.disclaimer,
        timings: { translateMs: tTranslate - t0, retrieveMs: tRetrieve - tTranslate, generateMs: tGenerate - tRetrieve },
      });
    }

    // Missing answer text (e.g. main-model JSON parse failure) still needs a
    // safe fallback — this is independent of the output guard below.
    if (!parsed.answer) {
      return res.status(200).json({
        answer: `${strings.notFromDb} ${strings.redirect}`,
        sourceIds: [],
        tier: 3,
        tierLabel: strings.tier3Label,
        confidence: topScore,
        gap: null,
        chips: strings.redirectChips,
        retrievedDocIds: matches.map((m) => m.doc.id),
        guardVerdict: null,
        disclaimer: strings.disclaimer,
        timings: { translateMs: tTranslate - t0, retrieveMs: tRetrieve - tTranslate, generateMs: tGenerate - tRetrieve },
      });
    }

    // --- Output moderation: BLOCKING gate by default. Replaces the
    // previous telemetry-only classifier, which logged a verdict but never
    // withheld an answer. A flagged answer here is never returned to the
    // user — it is swapped for the same redirect used for input-side
    // refusals. On a moderation-call failure, behavior follows
    // MODERATION_FAIL_MODE (open by default): fail open serves the answer
    // with moderation_skipped: true logged and flagged on the response;
    // fail closed returns 503 rather than silently serving an unmoderated
    // answer.
    let moderationResult = null;
    let moderationSkipped = false;
    try {
      moderationResult = await withProviderTimeout((signal) => openai.moderations.create({
        model: MODERATION_MODEL,
        input: parsed.answer || '',
      }, { signal }));
    } catch (err) {
      console.error('output moderation error', err);
      if (MODERATION_FAIL_MODE === 'closed') {
        return res.status(503).json({ error: 'moderation_unavailable' });
      }
      moderationSkipped = true;
    }
    const tGuard = Date.now();
    const moderation = moderationResult?.results?.[0];
    const flaggedCategories = moderation ? Object.entries(moderation.categories || {}).filter(([, isFlagged]) => isFlagged).map(([name]) => name) : [];
    const guardVerdict = moderationSkipped ? 'SKIPPED:moderation_error' : (moderation?.flagged ? `FLAGGED:${flaggedCategories.join(',') || 'unspecified'}` : 'SAFE');

    const timings = {
      translateMs: tTranslate - t0,
      retrieveMs: tRetrieve - tTranslate,
      generateMs: tGenerate - tRetrieve,
      guardMs: tGuard - tGenerate,
    };

    if (moderation?.flagged) {
      console.warn(`[answer] output blocked by moderation: ${guardVerdict}`);
      return res.status(200).json({
        answer: strings.redirect,
        sourceIds: [],
        tier: 'refuse',
        tierLabel: null,
        confidence: topScore,
        gap: null,
        chips: strings.redirectChips,
        retrievedDocIds: matches.map((m) => m.doc.id),
        disclaimer: strings.disclaimer,
        guardVerdict,
        moderation_skipped: false,
        timings,
      });
    }

    const tier = baseTier;
    const tierLabel = tier === 1 ? strings.tier1Label : tier === 2 ? strings.tier2Label : strings.tier3Label;

    // The scheme the model actually cited leads the source list, so the card's
    // The source the model cited leads the source list rather than whichever
    // record happened to rank first in retrieval.
    const citedId = Array.isArray(parsed.sourceIds) ? parsed.sourceIds[0] : null;
    const orderedMatches = citedId
      ? [...matches].sort((a, b) => (b.doc.id === citedId) - (a.doc.id === citedId))
      : matches;
    const primaryDoc = orderedMatches[0]?.doc || null;

    // documentsNeeded comes straight from the curated corpus, never from model
    // output — this list is the artifact users screenshot and carry into an
    // office, so a hallucinated document here has a real-world cost.
    const documentsNeeded = tier === 3 ? [] : (primaryDoc?.documents_required || []);

    return res.status(200).json({
      answer: tier === 3 ? `${parsed.answer} ${strings.notFromDb}` : parsed.answer,
      sourceIds: parsed.sourceIds || matches.map((m) => m.doc.id),
      tier,
      tierLabel,
      confidence: topScore,
      gap: tier === 2 ? parsed.gap || null : null,
      documentsNeeded,
      retrievedDocIds: matches.map((m) => m.doc.id),
      sources: orderedMatches.map((m) => ({
        id: m.doc.id,
        name: m.doc.name,
        type: m.doc.kind,
        url: m.doc.official_url,
        reviewedOn: m.doc.reviewed_on || null,
        helpline: m.doc.helpline,
        deadline: m.doc.application?.deadline || null,
        governmentEntity: m.doc.government_entity?.name || null,
      })),
      disclaimer: strings.disclaimer,
      guardVerdict,
      moderation_skipped: moderationSkipped,
      modelUsed,
      timings,
    });
  } catch (err) {
    console.error('answer error', err);
    return res.status(500).json({ error: 'answer_failed' });
  }
};
