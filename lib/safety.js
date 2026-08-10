// A deterministic, auditable floor for clearly harmful instructions. The
// model guard remains defence-in-depth, never the only refusal mechanism.
const RULES = [
  { category: 'physical_harm', pattern: /\b(?:kill|murder|stab|shoot|poison|hurt|attack)\b|(?:मारना|हत्या|ज़हर|जहर|हमला)/iu },
  { category: 'weapons', pattern: /\b(?:bomb|explosive|weapon|gun|molotov)\b|(?:बम|विस्फोटक|हथियार|बंदूक)/iu },
  { category: 'fraud_or_theft', pattern: /\b(?:steal|fraud|forge|fake\s+(?:aadhaar|identity|certificate)|bribe|bypass\s+(?:otp|verification))\b|(?:चोरी|धोखाधड़ी|जाली|रिश्वत)/iu },
  { category: 'self_harm', pattern: /\b(?:suicide|self[- ]harm|kill myself)\b|(?:आत्महत्या|खुदकुशी)/iu },
];

function checkDeterministicSafety(text) {
  const value = String(text || '').normalize('NFKC');
  const match = RULES.find((rule) => rule.pattern.test(value));
  return match ? { flagged: true, category: match.category } : { flagged: false, category: null };
}

module.exports = { checkDeterministicSafety };
