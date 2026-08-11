const OpenAI = require('openai');
const { toFile } = require('openai');
const { validateAudio, cleanLanguage } = require('../lib/apiValidation');
const { secureEndpoint } = require('../lib/serverSecurity');
const { logFailure } = require('../lib/providerError');
const { withProviderTimeout } = require('../lib/providerTimeout');
const { TASKS } = require('../config/ai');

// Client sends { audioBase64, mimeType } — JSON body, not multipart.
// Keeping the upload as base64-in-JSON avoids multipart parsing edge cases
// in serverless functions and keeps this route trivial to test with curl.
//
// response_format is 'json', not 'verbose_json' — verbose_json (language
// detection, duration, segments) is a Whisper-specific feature; committed-
// turn models are not guaranteed to support it, so this asks only for what
// every transcription model accepts. Neither field it would have added was
// ever read by the client, only by this response body.
//
// The provider infers the container from the upload's filename, so every type
// accepted by ALLOWED_AUDIO_TYPES in lib/apiValidation.js needs an entry here.
// A missing one mislabels the file and the provider rejects it with a 400
// that reads as a corrupt recording: audio/m4a and audio/ogg were both being
// sent as .webm, so any browser that records in those formats could not
// transcribe at all.
const AUDIO_EXTENSIONS = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/ogg': 'ogg',
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const identity = await secureEndpoint(req, res);
  if (!identity) return;
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not set on server' });
  }

  try {
    const { audioBase64, mimeType = 'audio/webm', language } = req.body || {};
    const validated = validateAudio(audioBase64, mimeType);
    if (validated.error) return res.status(400).json({ error: validated.error });
    const buffer = validated.buffer;
    const ext = AUDIO_EXTENSIONS[String(mimeType).split(';')[0].trim()] || 'webm';
    const file = await toFile(buffer, `audio.${ext}`);

    const openai = new OpenAI();
    const lang = cleanLanguage(language);
    const transcription = await withProviderTimeout((signal) => openai.audio.transcriptions.create({
      file,
      model: TASKS.transcription.model,
      temperature: 0,
      response_format: 'json',
      language: lang,
    }, { signal }));

    return res.status(200).json({
      text: transcription.text,
      language: lang,
      duration: null,
    });
  } catch (err) {
    logFailure('transcribe', err);
    return res.status(500).json({ error: 'transcription_failed' });
  }
};
