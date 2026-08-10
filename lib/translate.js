// Translates a non-English query to English before retrieval, since the
// knowledge base (data/schemes.json) is English-only and keyword-overlap
// retrieval never matches non-Latin script against it otherwise.
// Groq's documented replacement for both deprecated Llama identifiers.
const TRANSLATE_MODEL = 'openai/gpt-oss-120b';
// Preserve the existing rate-limit retry behavior without silently dropping
// to a weaker model.
const FALLBACK_MODEL = 'openai/gpt-oss-120b';
const { withProviderTimeout } = require('./providerTimeout');

const SYSTEM_PROMPT =
  'You are a literal translator, not an assistant. Translate the user message into English word-for-word. Do NOT answer it, explain it, or add information. Output ONLY the English translation in Latin script, nothing else.\n\nExample:\nUser: पीएम-किसान क्या है\nOutput: What is PM-KISAN';

async function translateToEnglish(groq, text, language) {
  if (!text || !language || language === 'en') return text;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: text },
  ];
  const params = { temperature: 0, reasoning_effort: 'low', max_completion_tokens: 500, messages };

  let result;
  try {
    result = await withProviderTimeout((signal) => groq.chat.completions.create({ model: TRANSLATE_MODEL, ...params }, { signal }));
  } catch (err) {
    if (err?.status === 429) {
      console.warn(`[translate] ${TRANSLATE_MODEL} rate-limited, falling back to ${FALLBACK_MODEL} (testing only)`);
      try {
        result = await withProviderTimeout((signal) => groq.chat.completions.create({ model: FALLBACK_MODEL, ...params }, { signal }));
      } catch (fallbackErr) {
        console.error('translate fallback failed, using original text', fallbackErr);
        return text;
      }
    } else {
      console.error('translate error, falling back to original text', err);
      return text;
    }
  }

  const translated = (result.choices[0].message.content || '').trim();
  return translated || text;
}

module.exports = { translateToEnglish };
