const Groq = require('groq-sdk');
const { toFile } = require('groq-sdk');
const { validateAudio, cleanLanguage } = require('../lib/apiValidation');
const { secureEndpoint } = require('../lib/serverSecurity');
const { withProviderTimeout } = require('../lib/providerTimeout');

// Client sends { audioBase64, mimeType } — JSON body, not multipart.
// Keeping the upload as base64-in-JSON avoids multipart parsing edge cases
// in serverless functions and keeps this route trivial to test with curl.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const identity = await secureEndpoint(req, res);
  if (!identity) return;
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not set on server' });
  }

  try {
    const { audioBase64, mimeType = 'audio/webm', language } = req.body || {};
    const validated = validateAudio(audioBase64, mimeType);
    if (validated.error) return res.status(400).json({ error: validated.error });
    const buffer = validated.buffer;
    const ext = (mimeType || '').includes('mp4') ? 'm4a' : 'webm';
    const file = await toFile(buffer, `audio.${ext}`);

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const lang = cleanLanguage(language);
    const transcription = await withProviderTimeout((signal) => groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      temperature: 0,
      response_format: 'verbose_json',
      language: lang,
    }, { signal }));

    return res.status(200).json({
      text: transcription.text,
      language: transcription.language || null,
      duration: transcription.duration || null,
    });
  } catch (err) {
    console.error('transcribe error', err);
    return res.status(500).json({ error: 'transcription_failed' });
  }
};
