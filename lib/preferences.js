const STORAGE_KEY = "aadya_preferences_v3";

// Manually mirrors config/ai.js's verified LANGUAGES list. This file is
// client-side, loaded straight into the browser with no bundler or build
// step, so it cannot require() the server config directly. Keep the two in
// sync by hand — scripts/test-product.js asserts they match, so drift here
// fails `npm test` rather than shipping silently.
export const LANGUAGES = [
  { code: "en", label: "English", locale: "en-IN" },
  { code: "hi", label: "हिंदी", locale: "hi-IN" },
  { code: "mr", label: "मराठी", locale: "mr-IN" },
  { code: "ta", label: "தமிழ்", locale: "ta-IN" },
  { code: "te", label: "తెలుగు", locale: "te-IN" },
  { code: "kn", label: "ಕನ್ನಡ", locale: "kn-IN" },
  { code: "ml", label: "മലയാളം", locale: "ml-IN" },
];

// Kept only for the scripted demo's named scenarios. A persona is never read
// from or written to device preferences.
const DEMO_PERSONAS = {
  family: "For myself or family",
  farmer: "Farmer",
  student: "Student",
  "field-worker": "Field worker",
  senior: "Senior or caregiver",
  caregiver: "Caregiver",
};

const COPY = {
  en: { language: "Language", textSize: "Text size", speechRate: "Speech rate", autoplay: "Play answers automatically" },
  hi: { language: "भाषा", textSize: "अक्षर का आकार", speechRate: "बोलने की गति", autoplay: "उत्तर अपने-आप सुनाएँ" },
};

const DEFAULTS = { language: "en", textSize: "normal", speechRate: 1, autoplay: false };

function normalizePreferences(raw = {}) {
  const next = {
    language: raw.language,
    textSize: raw.textSize,
    speechRate: raw.speechRate,
    autoplay: raw.autoplay,
  };
  if (!LANGUAGES.some((item) => item.code === next.language)) next.language = DEFAULTS.language;
  if (!["normal", "large", "xlarge"].includes(next.textSize)) next.textSize = DEFAULTS.textSize;
  next.speechRate = Math.min(1.25, Math.max(0.75, Number(next.speechRate) || DEFAULTS.speechRate));
  next.autoplay = next.autoplay === true;
  return next;
}

export function getPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return normalizePreferences({ ...DEFAULTS, ...saved });
  } catch {
    return { ...DEFAULTS };
  }
}

export function setPreferences(patch) {
  // Whitelist the four real preferences so old persona/mode keys are removed
  // from shared-device storage on the next write.
  const next = normalizePreferences({ ...getPreferences(), ...patch });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  applyPreferences(next);
  window.dispatchEvent(new CustomEvent("aadya:preferences", { detail: next }));
  return next;
}

export function applyPreferences(preferences = getPreferences()) {
  const apply = () => {
    const language = LANGUAGES.find((item) => item.code === preferences.language) || LANGUAGES[0];
    document.documentElement.lang = language.locale;
    document.documentElement.dataset.language = language.code;
    document.documentElement.dataset.textSize = preferences.textSize;
    if (document.body) {
      document.body.dataset.language = language.code;
      document.body.dataset.textSize = preferences.textSize;
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply, { once: true });
  else apply();
  return preferences;
}

export function getCopy(key, language = getPreferences().language) {
  return COPY[language]?.[key] || COPY.en[key] || key;
}

export function getPersona(id = "family") {
  const label = DEMO_PERSONAS[id] || DEMO_PERSONAS.family;
  return { id, label, short: label, description: "Scripted demo scenario" };
}

export function preferenceControlsMarkup({ compact = false } = {}) {
  const prefs = getPreferences();
  const options = LANGUAGES.map((item) => `<option value="${item.code}"${item.code === prefs.language ? " selected" : ""}>${item.label}</option>`).join("");
  return `<div class="preference-controls${compact ? " compact" : ""}" aria-label="Aadya preferences">
    <label><span>${getCopy("language", prefs.language)}</span><select data-pref-language>${options}</select></label>
  </div>`;
}

export function mountPreferenceControls(target, options = {}) {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!element) return null;
  const render = () => {
    element.innerHTML = preferenceControlsMarkup(options);
    element.querySelector("[data-pref-language]")?.addEventListener("change", (event) => setPreferences({ language: event.target.value }));
  };
  render();
  const onChange = () => render();
  window.addEventListener("aadya:preferences", onChange);
  return () => window.removeEventListener("aadya:preferences", onChange);
}

export function translatePage(root = document, language = getPreferences().language) {
  root.querySelectorAll("[data-i18n]").forEach((node) => {
    const translated = getCopy(node.dataset.i18n, language);
    if (node.matches("input, textarea")) node.placeholder = translated;
    else node.textContent = translated;
  });
}

applyPreferences();
