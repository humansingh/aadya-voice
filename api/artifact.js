const crypto = require('crypto');
const OpenAI = require('openai');
const { cleanText, cleanLanguage } = require('../lib/apiValidation');
const { secureEndpoint } = require('../lib/serverSecurity');
const { logFailure } = require('../lib/providerError');
const { withProviderTimeout } = require('../lib/providerTimeout');
const { checkDeterministicSafety } = require('../lib/safety');
const { TASKS, LANGUAGES, LANGUAGE_PRESENTATION_RULE } = require('../config/ai');

const MODEL = TASKS.reasoning.model;
const ALLOWED_KINDS = new Set(['application', 'checklist']);
const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'aadya_artifact',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        subtitle: { type: 'string' },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              heading: { type: 'string' },
              body: { type: 'string' },
              items: { type: 'array', items: { type: 'string' } },
            },
            required: ['heading', 'body', 'items'],
            additionalProperties: false,
          },
        },
        missingInformation: { type: 'array', items: { type: 'string' } },
        caveat: { type: 'string' },
      },
      required: ['title', 'subtitle', 'sections', 'missingInformation', 'caveat'],
      additionalProperties: false,
    },
  },
};

function safeString(value, maxLength, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.trim().slice(0, maxLength);
}

function normalizeArtifact(value, kind) {
  const sections = Array.isArray(value?.sections) ? value.sections.slice(0, 8).map((section) => ({
    heading: safeString(section?.heading, 120, 'Section'),
    body: safeString(section?.body, 4000),
    items: Array.isArray(section?.items) ? section.items.slice(0, 20).map((item) => safeString(item, 500)).filter(Boolean) : [],
  })).filter((section) => section.body || section.items.length) : [];
  if (!sections.length) throw new Error('artifact_empty');
  return {
    id: `artifact_${crypto.randomUUID()}`,
    kind,
    title: safeString(value.title, 180, kind === 'application' ? 'Application preparation draft' : 'Preparation checklist'),
    subtitle: safeString(value.subtitle, 300),
    sections,
    missingInformation: Array.isArray(value.missingInformation) ? value.missingInformation.slice(0, 20).map((item) => safeString(item, 500)).filter(Boolean) : [],
    caveat: safeString(value.caveat, 700, 'This is a preparation draft, not a submitted application. Confirm every detail at the official source.'),
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const identity = await secureEndpoint(req, res);
  if (!identity) return;
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set on server' });

  try {
    const body = req.body || {};
    const kind = ALLOWED_KINDS.has(body.kind) ? body.kind : null;
    const language = cleanLanguage(body.language);
    const question = cleanText(body.question, 1200);
    const answer = cleanText(body.answer, 5000);
    if (!kind || !question || !answer) return res.status(400).json({ error: 'invalid_artifact_request' });

    // This endpoint has no client-side pre-flight equivalent to
    // /api/guard-input, so the deterministic floor runs here directly,
    // before any model call, on both the original question and the answer
    // text being carried into the draft.
    const deterministic = checkDeterministicSafety(`${question}\n${answer}`);
    if (deterministic.flagged) {
      console.warn(`[artifact] blocked by deterministic safety check: ${deterministic.category}`);
      return res.status(400).json({ error: 'content_flagged' });
    }

    const sources = Array.isArray(body.sources) ? body.sources.slice(0, 8).map((source) => ({
      name: safeString(source?.name, 180),
      url: /^https:\/\//.test(String(source?.url || '')) ? String(source.url).slice(0, 1000) : '',
      reviewedOn: safeString(source?.reviewedOn, 20),
    })).filter((source) => source.name || source.url) : [];
    const existingChecklist = Array.isArray(body.existingChecklist) ? body.existingChecklist.slice(0, 30).map((item) => safeString(item, 400)).filter(Boolean) : [];
    let remainingText = 20000;
    const attachments = Array.isArray(body.attachments) ? body.attachments.slice(0, 3).map((attachment) => {
      const text = safeString(attachment?.text, Math.min(12000, remainingText));
      remainingText -= text.length;
      return { name: safeString(attachment?.name, 120, 'Attachment'), type: safeString(attachment?.type, 80), text };
    }) : [];

    const task = kind === 'application'
      ? 'Prepare a fill-in application draft. Use placeholders in square brackets for every applicant fact that is not explicitly provided.'
      : 'Prepare a practical, ordered checklist for confirming eligibility, gathering documents and using the official application route.';
    const attachmentContext = attachments.length ? attachments.map((attachment) => `FILE: ${attachment.name} (${attachment.type})\n${attachment.text || '[File attached as a reference; its contents were not extracted.]'}`).join('\n\n') : '(none)';
    const sourceContext = sources.length ? sources.map((source) => `${source.name}\n${source.url}\nChecked: ${source.reviewedOn || 'not stated'}`).join('\n\n') : '(none)';
    const languageLabel = LANGUAGES.find((entry) => entry.code === language)?.label || 'English';
    const openai = new OpenAI();
    // No temperature — see the note in api/answer.js: this model rejects any
    // explicit temperature with 400 unsupported_value.
    const completion = await withProviderTimeout((signal) => openai.chat.completions.create({
      model: MODEL,
      reasoning_effort: 'low',
      max_completion_tokens: 2200,
      response_format: RESPONSE_FORMAT,
      messages: [
        { role: 'system', content: `You prepare careful public-service application aids for India. You never submit anything, determine eligibility, or invent personal facts, deadlines, rules, document requirements, contact details or URLs. ${task} Use only the supplied answer, source list, existing checklist and readable attachment text. An attachment without extracted text is not evidence. Put every missing personal or scheme-specific fact in missingInformation. Keep official URLs verbatim. Write in simple ${languageLabel}, in that language's own script.\n\n${LANGUAGE_PRESENTATION_RULE}\n\nThe caveat must say this is a preparation draft, not a submitted application, and that every detail must be confirmed at the official source. Return only the required JSON.` },
        { role: 'user', content: `QUESTION\n${question}\n\nAADYA ANSWER\n${answer}\n\nOFFICIAL SOURCES\n${sourceContext}\n\nEXISTING DOCUMENT CHECKLIST\n${existingChecklist.join('\n') || '(none)'}\n\nTRANSIENT ATTACHMENTS\n${attachmentContext}` },
      ],
    }, { signal }));
    const raw = completion.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(raw.trim().replace(/^```json\s*|\s*```$/g, ''));
    return res.status(200).json({ artifact: normalizeArtifact(parsed, kind), modelUsed: MODEL });
  } catch (error) {
    logFailure('artifact', error);
    return res.status(error?.code === 'PROVIDER_TIMEOUT' ? 504 : 500).json({ error: error?.code === 'PROVIDER_TIMEOUT' ? 'artifact_timeout' : 'artifact_failed' });
  }
};
