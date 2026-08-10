// Fixed per-language strings for tier labels, gap phrasing, and fallbacks.
// Kept as a static dictionary (not generated per-request) so the same
// question always produces the same label/caveat wording.
const STRINGS = {
  en: {
    tier1Label: 'Matched to a prototype record — confirm at the official link',
    tier2Label: 'Partly covered — confirm the rest',
    tier3Label: 'General guidance — not from scheme records',
    notFromDb: "This isn't from our scheme database — general guidance only.",
    redirect: "I can only help with Indian government scheme questions — things like eligibility, documents, or where to apply. I can't help with that one.",
    redirectChips: ['What is PM-KISAN', 'Documents for Ayushman Bharat'],
    disclaimer: 'Not a government service. This information is free.',
  },
  hi: {
    tier1Label: 'प्रोटोटाइप रिकॉर्ड से मिलान — आधिकारिक लिंक पर पुष्टि करें',
    tier2Label: 'आंशिक जानकारी — बाकी की पुष्टि करें',
    tier3Label: 'सामान्य जानकारी — योजना रिकॉर्ड से नहीं',
    notFromDb: 'यह हमारे योजना डेटाबेस से नहीं है — केवल सामान्य जानकारी।',
    redirect: 'मैं केवल भारत सरकार की योजनाओं से जुड़े सवालों में मदद कर सकता हूँ — जैसे पात्रता, दस्तावेज़, या आवेदन कहाँ करें। इसमें मैं मदद नहीं कर सकता।',
    redirectChips: ['PM-KISAN क्या है', 'आयुष्मान भारत के दस्तावेज़'],
    disclaimer: 'यह सरकारी सेवा नहीं है। यह जानकारी निःशुल्क है।',
  },
};

function getStrings(language) {
  return STRINGS[language] || STRINGS.en;
}

module.exports = { getStrings, SUPPORTED_LANGS: Object.keys(STRINGS) };
