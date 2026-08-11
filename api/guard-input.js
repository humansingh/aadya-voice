const OpenAI = require('openai');
const { cleanText } = require('../lib/apiValidation');
const { secureEndpoint } = require('../lib/serverSecurity');
const { logFailure } = require('../lib/providerError');
const { withProviderTimeout } = require('../lib/providerTimeout');
const { checkDeterministicSafety } = require('../lib/safety');
const { TASKS } = require('../config/ai');

const MODERATION_MODEL = TASKS.moderation.model;

// Client-side pre-flight for UX (see api/answer.js and api/artifact.js for
// the server-side deterministic re-check a direct POST can't skip). Runs
// the transcript through omni-moderation-latest before it ever reaches the
// main model — the final model stack has no dedicated jailbreak/prompt-
// injection classifier, so this content-moderation model is the sole
// model-based input check, same model as the output gate in api/answer.js.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const identity = await secureEndpoint(req, res);
  if (!identity) return;
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not set on server' });
  }

  try {
    const { text: rawText } = req.body || {};
    const text = cleanText(rawText, 1200);
    if (!text) return res.status(400).json({ error: 'text must be 1-1200 characters' });

    const deterministic = checkDeterministicSafety(text);
    if (deterministic.flagged) return res.status(200).json({ flagged: true, score: 1, source: 'code', category: deterministic.category });

    const openai = new OpenAI();
    const moderationResult = await withProviderTimeout((signal) => openai.moderations.create({
      model: MODERATION_MODEL,
      input: text,
    }, { signal }));

    const result = moderationResult.results?.[0];
    const categoryScores = Object.values(result?.category_scores || {});
    const score = categoryScores.length ? Math.max(...categoryScores) : 0;
    const flagged = Boolean(result?.flagged);

    return res.status(200).json({ flagged, score, source: 'model' });
  } catch (err) {
    logFailure('guard-input', err);
    // Fail closed: if the guard itself errors, treat as flagged so we don't
    // silently skip a safety check.
    return res.status(200).json({ flagged: true, verdict: 'GUARD_ERROR' });
  }
};
