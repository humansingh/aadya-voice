const Groq = require('groq-sdk');
const { cleanText } = require('../lib/apiValidation');
const { secureEndpoint } = require('../lib/serverSecurity');
const { withProviderTimeout } = require('../lib/providerTimeout');
const { checkDeterministicSafety } = require('../lib/safety');

// Runs the transcript through Llama Prompt Guard 2 before it ever reaches
// the main model. If this flags the input, we refuse before doing any
// retrieval or generation.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const identity = await secureEndpoint(req, res);
  if (!identity) return;
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not set on server' });
  }

  try {
    const { text: rawText } = req.body || {};
    const text = cleanText(rawText, 1200);
    if (!text) return res.status(400).json({ error: 'text must be 1-1200 characters' });

    const deterministic = checkDeterministicSafety(text);
    if (deterministic.flagged) return res.status(200).json({ flagged: true, score: 1, source: 'code', category: deterministic.category });

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const result = await withProviderTimeout((signal) => groq.chat.completions.create({
      messages: [{ role: 'user', content: text }],
      model: 'meta-llama/llama-prompt-guard-2-86m',
      temperature: 1,
      max_completion_tokens: 1,
      top_p: 1,
      stream: false,
    }, { signal }));

    // Prompt Guard 2 returns a jailbreak/injection probability score (0-1) as
    // the completion text, not a text label — score close to 1 means likely
    // malicious/injected input.
    const score = parseFloat(result.choices[0].message.content || '0');
    const FLAG_THRESHOLD = 0.5;
    const flagged = Number.isNaN(score) || score >= FLAG_THRESHOLD;

    return res.status(200).json({ flagged, score, source: 'model' });
  } catch (err) {
    console.error('guard-input error', err);
    // Fail closed: if the guard itself errors, treat as flagged so we don't
    // silently skip a safety check.
    return res.status(200).json({ flagged: true, verdict: 'GUARD_ERROR' });
  }
};
