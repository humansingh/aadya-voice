// Translates a non-English query to English before retrieval, since the
// knowledge base is English-only and embedding/keyword-overlap retrieval
// never matches non-Latin script against it otherwise. This is lexical
// query expansion only — the original question (not this translation)
// is what reaches the reasoning model; see api/answer.js.
const { withProviderTimeout } = require('./providerTimeout');
const { logFailure } = require('./providerError');
const { TASKS } = require('../config/ai');

const TRANSLATE_MODEL = TASKS.lightweight.model;

const SYSTEM_PROMPT =
  'You are a literal translator, not an assistant. Translate the user message into English word-for-word. Do NOT answer it, explain it, or add information. Output ONLY the English translation in Latin script, nothing else.\n\nExample:\nUser: पीएम-किसान क्या है\nOutput: What is PM-KISAN';

async function translateToEnglish(client, text, language) {
  if (!text || !language || language === 'en') return text;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: text },
  ];

  let result;
  try {
    // No temperature — see the note in api/answer.js: this model rejects any
    // explicit temperature with 400 unsupported_value. This call runs first in
    // the answer flow, so a 400 here took down every non-English question.
    result = await withProviderTimeout((signal) => client.chat.completions.create({
      model: TRANSLATE_MODEL, reasoning_effort: 'low', max_completion_tokens: 500, messages,
    }, { signal }));
  } catch (err) {
    logFailure('translate (falling back to original text)', err);
    return text;
  }

  const translated = (result.choices[0].message.content || '').trim();
  return translated || text;
}

module.exports = { translateToEnglish };
