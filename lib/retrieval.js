const { getPublishedOpportunities, getLocalPublishedOpportunities, buildRetrievalText } = require('./opportunityRepository');

const STOPWORDS = new Set(['a', 'an', 'and', 'are', 'at', 'be', 'can', 'do', 'for', 'from', 'how', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'the', 'to', 'what', 'when', 'where', 'which', 'with']);

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0900-\u097F\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^-+|-+$/g, ''))
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

function scoreDoc(query, queryTokens, doc) {
  const title = [doc.title, ...(doc.aliases || [])].filter(Boolean).join(' ').toLowerCase();
  const haystack = buildRetrievalText(doc).toLowerCase();
  const hayTokens = new Set(tokenize(haystack));
  if (!queryTokens.length) return 0;

  let weightedHits = 0;
  let availableWeight = 0;
  for (const token of queryTokens) {
    const weight = token.length >= 6 ? 1.3 : 1;
    availableWeight += weight;
    if (title.includes(token)) weightedHits += weight * 1.6;
    else if (hayTokens.has(token) || haystack.includes(token)) weightedHits += weight;
  }

  let score = weightedHits / Math.max(availableWeight * 1.6, 1);
  const normalizedQuery = query.toLowerCase();
  if ((doc.aliases || []).some((alias) => alias.length >= 4 && normalizedQuery.includes(alias.toLowerCase()))) score += 0.32;
  if (doc.title && normalizedQuery.includes(doc.title.toLowerCase())) score += 0.35;

  const kindHints = {
    job: ['job', 'vacancy', 'recruitment', 'post', 'career', 'principal'],
    scholarship: ['scholarship', 'student', 'college', 'study', 'education'],
    scholarship_portal: ['scholarship', 'student', 'deadline', 'portal'],
    scheme: ['scheme', 'yojana', 'benefit', 'pension', 'farmer', 'housing', 'health'],
    official_directory: ['official', 'government', 'portal', 'find', 'where', 'scheme', 'scholarship', 'job', 'recruitment'],
  };
  if ((kindHints[doc.kind] || []).some((hint) => queryTokens.includes(hint))) score += 0.08;
  const state = doc.geography?.state?.toLowerCase();
  if (state && normalizedQuery.includes(state)) score += 0.1;
  return Math.min(score, 1);
}

async function retrieve(query, topK = 5) {
  const docs = await getPublishedOpportunities();
  const queryTokens = tokenize(query);
  return docs
    .map((doc) => ({ doc, score: scoreDoc(query, queryTokens, doc) }))
    .sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title))
    .slice(0, topK)
    .filter((match) => match.score >= 0.08);
}

module.exports = { retrieve, tokenize, scoreDoc, schemes: getLocalPublishedOpportunities() };
