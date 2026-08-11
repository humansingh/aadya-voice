// Pronunciation normalisation for text-to-speech.
//
// Google Cloud TTS reads scheme acronyms the way they are spelled, which
// produces "pum-kisan", "mig-nrega" and helplines read as one enormous number.
// This rewrites the text on its way to the synthesiser only — the visible
// answer keeps its normal spelling.
//
// CommonJS, because api/speak.js runs on the Vercel Node runtime.

// Order matters: longer, more specific patterns must be replaced before the
// shorter ones they contain (PMAY-G before PMAY, PM-KISAN before PM).
const RULES = [
  { pattern: /PM[-\s]?KISAN/gi, en: 'P M Kisaan', hi: 'पी एम किसान' },
  { pattern: /PMAY[-\s]?G/gi, en: 'P M A Y Gramin', hi: 'पी एम ए वाई ग्रामीण' },
  { pattern: /PMAY[-\s]?U/gi, en: 'P M A Y Urban', hi: 'पी एम ए वाई अर्बन' },
  { pattern: /\bPMAY\b/gi, en: 'P M A Y', hi: 'पी एम ए वाई' },
  { pattern: /PM[-\s]?USP/gi, en: 'P M U S P', hi: 'पी एम यू एस पी' },
  { pattern: /PM[-\s]?JAY/gi, en: 'P M J A Y', hi: 'पी एम जे ए वाई' },
  { pattern: /\bMGNREGA\b/gi, en: 'Mannrega', hi: 'मनरेगा' },
  { pattern: /\bNREGA\b/gi, en: 'Nrega', hi: 'नरेगा' },
  { pattern: /\bUPSC\b/gi, en: 'U P S C', hi: 'यू पी एस सी' },
  { pattern: /\bTGT\b/gi, en: 'T G T', hi: 'टी जी टी' },
  { pattern: /\bPGT\b/gi, en: 'P G T', hi: 'पी जी टी' },
  { pattern: /\bB\.?\s?Ed\.?\b/g, en: 'B Ed', hi: 'बी एड' },
  { pattern: /\bM\.\s?A\.?/g, en: 'M A', hi: 'एम ए' },
  { pattern: /\bCSC\b/gi, en: 'C S C', hi: 'सी एस सी' },
  { pattern: /\be[-\s]?KYC\b/gi, en: 'e K Y C', hi: 'ई के वाई सी' },
  { pattern: /\bIFSC\b/gi, en: 'I F S C', hi: 'आई एफ एस सी' },
  { pattern: /\bIGNOAPS\b/gi, en: 'I G N O A P S', hi: 'आई जी एन ओ ए पी एस' },
  { pattern: /\bEPIC\b/g, en: 'E P I C', hi: 'ई पी आई सी' },
  { pattern: /\bBLO\b/g, en: 'B L O', hi: 'बी एल ओ' },
];

const DIGIT_WORDS = {
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
  hi: ['शून्य', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ'],
};

// Helplines and other bare 4+ digit runs must be read digit by digit. Money and
// dates are excluded: a rupee amount or a year read as separate digits is worse
// than the default reading.
function spellHelplines(text, language) {
  const words = DIGIT_WORDS[language] || DIGIT_WORDS.en;
  const separator = language === 'hi' ? ' ' : ' ';
  return text.replace(/(₹\s?|Rs\.?\s?)?\b[\d,-]*\d[\d,-]{3,}\b(\s*(?:rupees|रुपये))?/gi, (match, rupee, money) => {
    if (rupee || money) return match; // an amount reads correctly as a number
    if (match.includes(',')) return match; // grouped digits are a quantity, not a helpline
    const digits = match.replace(/\D/g, '');
    if (digits.length < 4 || digits.length > 12) return match;
    if (/^(19|20)\d{2}$/.test(digits)) return match; // a year
    return digits.split('').map((digit) => words[Number(digit)]).join(separator);
  });
}

// "₹6,000" and "Rs 6,000" are read as a symbol or as "Rs"; spelling the unit
// out puts the amount in the right order for both languages.
function spellRupees(text, language) {
  const unit = language === 'hi' ? 'रुपये' : 'rupees';
  return text.replace(/(?:₹|\bRs\.?)\s?([\d,]+)/gi, (match, amount) => `${amount.replace(/,/g, '')} ${unit}`);
}

/**
 * Rewrites acronyms, helplines and rupee amounts into the form the synthesiser
 * reads correctly. Never changes what the user sees on screen.
 */
function forSpeech(text, language = 'en') {
  let value = String(text || '');
  const key = language === 'hi' ? 'hi' : 'en';
  for (const rule of RULES) {
    value = value.replace(rule.pattern, key === 'hi' ? rule.hi : rule.en);
  }
  // Helplines first: rupee amounts lose their commas below, and a bare "6000"
  // would then be mistaken for a number to read out digit by digit.
  value = spellHelplines(value, key);
  value = spellRupees(value, key);
  return value;
}

module.exports = { forSpeech, RULES };
