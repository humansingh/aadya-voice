// One-off script to sample the tier distribution across a mix of English,
// Hindi and Kannada questions against the local dev server. Not part of the
// app — run manually with `node scripts/test-tiers.js`.
const QUESTIONS = [
  { q: 'What is PM-KISAN', lang: 'en' },
  { q: 'How much money does PM-KISAN give per year', lang: 'en' },
  { q: 'What documents do I need for Ayushman Bharat', lang: 'en' },
  { q: 'Am I eligible for MGNREGA', lang: 'en' },
  { q: 'How do I apply for a scholarship under NSP', lang: 'en' },
  { q: 'What is Sukanya Samriddhi Yojana', lang: 'en' },
  { q: 'How do I get a free LPG connection under Ujjwala', lang: 'en' },
  { q: 'What is the old age pension scheme called', lang: 'en' },
  { q: 'How do I apply for a passport', lang: 'en' },
  { q: 'What is the capital of India', lang: 'en' },
  { q: 'पीएम-किसान क्या है', lang: 'hi' },
  { q: 'आयुष्मान भारत के लिए कौन से दस्तावेज़ चाहिए', lang: 'hi' },
  { q: 'मनरेगा में मुझे कितने दिन काम मिलेगा', lang: 'hi' },
  { q: 'राशन कार्ड कैसे बनवाएं', lang: 'hi' },
  { q: 'बुढ़ापा पेंशन योजना क्या है', lang: 'hi' },
  { q: 'PM-KISAN ಎಂದರೇನು', lang: 'kn' },
  { q: 'ಆಯುಷ್ಮಾನ್ ಭಾರತ್‌ಗೆ ಯಾವ ದಾಖಲೆಗಳು ಬೇಕು', lang: 'kn' },
  { q: 'ಉಜ್ವಲ ಯೋಜನೆಯಡಿ ಉಚಿತ ಗ್ಯಾಸ್ ಸಂಪರ್ಕ ಹೇಗೆ ಪಡೆಯುವುದು', lang: 'kn' },
  { q: 'ನನಗೆ ವೈದ್ಯಕೀಯ ಸಲಹೆ ಬೇಕು, ಜ್ವರಕ್ಕೆ ಏನು ಮಾಡಬೇಕು', lang: 'kn' },
  { q: 'ಮತದಾರರ ಗುರುತಿನ ಚೀಟಿ ಹೇಗೆ ಪಡೆಯುವುದು', lang: 'kn' },
];

async function main() {
  const baseUrl = process.env.SAHAYAK_URL || 'http://localhost:3000';
  const rows = [];
  for (const { q, lang } of QUESTIONS) {
    const res = await fetch(`${baseUrl}/api/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q, language: lang }),
    });
    const data = await res.json();
    rows.push({ lang, q, score: (data.confidence ?? 0).toFixed(3), tier: data.tier, guard: data.guardVerdict });
  }
  console.table(rows);
  const counts = rows.reduce((acc, r) => { acc[r.tier] = (acc[r.tier] || 0) + 1; return acc; }, {});
  console.log('Tier distribution:', counts, `(${rows.length} total)`);
}

main();
