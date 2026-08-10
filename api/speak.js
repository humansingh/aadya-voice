// Google Cloud Text-to-Speech (REST). Voice choices are intersected with the
// provider's live inventory so a renamed or withdrawn voice disappears from
// the selector instead of breaking synthesis.
const { LANGUAGES } = require('../config/ai');
const LANG_TO_BCP47 = Object.fromEntries(LANGUAGES.map((lang) => [lang.code, lang.ttsLanguageCode]));
const { cleanText, cleanLanguage } = require('../lib/apiValidation');
const { secureEndpoint } = require('../lib/serverSecurity');
const { withProviderTimeout } = require('../lib/providerTimeout');

const TIER_PREFERENCE = ['Chirp3-HD', 'Neural2', 'Wavenet', 'Standard'];
const PERSONA_BLUEPRINTS = [
  { suffix: 'Chirp3-HD-Aoede', label: 'Natural 1' },
  { suffix: 'Chirp3-HD-Kore', label: 'Natural 2' },
  { suffix: 'Chirp3-HD-Charon', label: 'Natural 3' },
  { suffix: 'Chirp3-HD-Puck', label: 'Natural 4' },
  { suffix: 'Neural2-A', label: 'Classic 1' },
  { suffix: 'Neural2-B', label: 'Classic 2' },
];

const voiceInventoryCache = new Map(); // languageCode -> provider voices (per warm instance)

async function listVoices(languageCode, apiKey) {
  if (voiceInventoryCache.has(languageCode)) return voiceInventoryCache.get(languageCode);

  const res = await withProviderTimeout((signal) => fetch(`https://texttospeech.googleapis.com/v1/voices?languageCode=${languageCode}&key=${apiKey}`, { signal }));
  if (!res.ok) throw new Error(`voices.list failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const voices = data.voices || [];
  if (!voices.length) throw new Error(`No voices available for ${languageCode}`);
  voiceInventoryCache.set(languageCode, voices);
  return voices;
}

function voicePersonas(voices) {
  return PERSONA_BLUEPRINTS.flatMap((persona) => {
    const voice = voices.find((candidate) => candidate.name.endsWith(persona.suffix));
    return voice ? [{ name: voice.name, label: persona.label, gender: voice.ssmlGender, tier: voice.name.includes('Chirp3-HD') ? 'Chirp 3 HD' : 'Neural2' }] : [];
  });
}

function pickDefaultVoice(voices) {
  const personas = voicePersonas(voices);
  if (personas.length) return personas[0].name;
  for (const tier of TIER_PREFERENCE) {
    const match = voices.filter((v) => v.name.includes(tier)).sort((a, b) => a.name.localeCompare(b.name))[0];
    if (match) return match.name;
  }
  return voices[0].name;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const identity = await secureEndpoint(req, res);
  if (!identity) return;
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GOOGLE_TTS_API_KEY not set on server' });

  try {
    const { action = 'synthesize', text: rawText, lang: rawLang, speakingRate: rawSpeakingRate, voiceName: rawVoiceName } = req.body || {};
    const lang = cleanLanguage(rawLang);
    const languageCode = LANG_TO_BCP47[lang] || 'en-IN';
    const voices = await listVoices(languageCode, apiKey);
    const personas = voicePersonas(voices);

    if (action === 'voices') {
      return res.status(200).json({ provider: 'google-cloud-tts', languageCode, defaultVoice: pickDefaultVoice(voices), voices: personas });
    }
    if (action !== 'synthesize') return res.status(400).json({ error: 'unsupported_tts_action' });

    const text = cleanText(rawText, 3000);
    if (!text) return res.status(400).json({ error: 'text must be 1-3000 characters' });
    const speakingRate = Math.min(1.25, Math.max(0.75, Number(rawSpeakingRate) || 1));
    const requestedVoiceName = cleanText(rawVoiceName, 128);
    const requestedVoice = requestedVoiceName ? voices.find((voice) => voice.name === requestedVoiceName) : null;
    if (requestedVoiceName && !requestedVoice) return res.status(400).json({ error: 'voice_not_available_for_language' });
    const voiceName = requestedVoice?.name || pickDefaultVoice(voices);

    const synthRes = await withProviderTimeout((signal) => fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: 'MP3', speakingRate },
      }),
      signal,
    }));

    if (!synthRes.ok) {
      const detail = await synthRes.text();
      console.error('tts provider error', synthRes.status, detail);
      return res.status(502).json({ error: 'tts_failed' });
    }

    const data = await synthRes.json();
    return res.status(200).json({ audioBase64: data.audioContent, voice: voiceName, languageCode, provider: 'google-cloud-tts' });
  } catch (err) {
    console.error('speak error', err);
    return res.status(500).json({ error: 'speak_failed' });
  }
};
