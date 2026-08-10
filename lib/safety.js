// A deterministic, auditable floor for clearly harmful instructions. The
// model guard remains defence-in-depth, never the only refusal mechanism.
//
// mr/ta/te/kn/ml terms below are a first-pass draft, not yet reviewed by a
// native speaker of each language — see the TODO on each pattern. Until
// reviewed, treat these five as a best-effort floor, not a verified one.
const RULES = [
  {
    category: 'physical_harm',
    // TODO: needs native-speaker review — drafted, not yet verified.
    pattern: /\b(?:kill|murder|stab|shoot|poison|hurt|attack)\b|(?:मारना|हत्या|ज़हर|जहर|हमला)|(?:मारणे|खून|वार करणे|गोळी मारणे|विष|दुखापत|हल्ला)|(?:கொல்ல|கொலை|குத்த|சுட|விஷம்|காயப்படுத்த|தாக்குதல்)|(?:చంపు|హత్య|పొడవడం|కాల్చడం|విషం|గాయపరచడం|దాడి)|(?:ಕೊಲ್ಲು|ಕೊಲೆ|ಇರಿ|ಗುಂಡು ಹಾರಿಸು|ವಿಷ|ಗಾಯಗೊಳಿಸು|ದಾಳಿ)|(?:കൊല്ലുക|കൊലപാതകം|കുത്തുക|വെടിവയ്ക്കുക|വിഷം|മുറിവേൽപ്പിക്കുക|ആക്രമണം)/iu,
  },
  {
    category: 'weapons',
    // TODO: needs native-speaker review — drafted, not yet verified.
    pattern: /\b(?:bomb|explosive|weapon|gun|molotov)\b|(?:बम|विस्फोटक|हथियार|बंदूक)|(?:बॉम्ब|स्फोटक|शस्त्र|बंदूक)|(?:குண்டு|வெடிபொருள்|ஆயுதம்|துப்பாக்கி)|(?:బాంబు|పేలుడు పదార్థం|ఆయుధం|తుపాకీ)|(?:ಬಾಂಬ್|ಸ್ಫೋಟಕ|ಆಯುಧ|ಬಂದೂಕು)|(?:ബോംബ്|സ്ഫോടക വസ്തു|ആയുധം|തോക്ക്)/iu,
  },
  {
    category: 'fraud_or_theft',
    // TODO: needs native-speaker review — drafted, not yet verified.
    pattern: /\b(?:steal|fraud|forge|fake\s+(?:aadhaar|identity|certificate)|bribe|bypass\s+(?:otp|verification))\b|(?:चोरी|धोखाधड़ी|जाली|रिश्वत)|(?:चोरी|फसवणूक|बनावट|लाच|ओटीपी बायपास)|(?:திருட்டு|மோசடி|போலி|லஞ்சம்|ஓடிபி புறக்கணி)|(?:దొంగతనం|మోసం|నకిలీ|లంచం|ఓటీపీ బైపాస్)|(?:ಕಳ್ಳತನ|ಮೋಸ|ನಕಲಿ|ಲಂಚ|ಒಟಿಪಿ ಬೈಪಾಸ್)|(?:മോഷണം|തട്ടിപ്പ്|വ്യാജ|കൈക്കൂലി|ഒടിപി മറികടക്കുക)/iu,
  },
  {
    category: 'self_harm',
    // TODO: needs native-speaker review — drafted, not yet verified.
    pattern: /\b(?:suicide|self[- ]harm|kill myself)\b|(?:आत्महत्या|खुदकुशी)|(?:आत्महत्या|स्वतःला इजा)|(?:தற்கொலை|என்னைத் தானே காயப்படுத்த)|(?:ఆత్మహత్య|నన్ను నేను గాయపరచుకోవడం)|(?:ಆತ್ಮಹತ್ಯೆ|ನನ್ನನ್ನು ನಾನೇ ಗಾಯಗೊಳಿಸಿಕೊಳ್ಳುವುದು)|(?:ആത്മഹത്യ|സ്വയം മുറിവേൽപ്പിക്കൽ)/iu,
  },
];

function checkDeterministicSafety(text) {
  const value = String(text || '').normalize('NFKC');
  const match = RULES.find((rule) => rule.pattern.test(value));
  return match ? { flagged: true, category: match.category } : { flagged: false, category: null };
}

module.exports = { checkDeterministicSafety };
