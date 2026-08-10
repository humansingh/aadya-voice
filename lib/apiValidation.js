const ALLOWED_LANGUAGES = new Set(['en', 'hi']);
const ALLOWED_AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/m4a',
  'audio/ogg',
]);

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > maxLength) return null;
  return text;
}

function cleanLanguage(value) {
  return ALLOWED_LANGUAGES.has(value) ? value : 'en';
}

function validateAudio(audioBase64, mimeType, maxBytes = 8 * 1024 * 1024) {
  if (typeof audioBase64 !== 'string' || !audioBase64) return { error: 'audioBase64 required' };
  if (!ALLOWED_AUDIO_TYPES.has(mimeType)) return { error: 'unsupported audio type' };
  const estimatedBytes = Math.floor((audioBase64.length * 3) / 4);
  if (estimatedBytes > maxBytes) return { error: 'audio exceeds 8 MB limit' };
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(audioBase64)) return { error: 'invalid audio encoding' };
  return { buffer: Buffer.from(audioBase64, 'base64') };
}

module.exports = { cleanText, cleanLanguage, validateAudio };
