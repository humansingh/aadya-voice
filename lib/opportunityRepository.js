const legacySchemes = require('../data/schemes.json');
const seedRepository = require('../data/master/seed-opportunities.json');
const generalContextRepository = require('../data/master/general-context.json');
const discoveryRepository = require('../data/master/myscheme-index.json');

const SERVICE_TITLE_PATTERN = /certificate|registration|licen[cs]e|portal|service|card|pension|health|housing|ration|identity|passport|voter|land record|birth|death|electricity|water|transport|legal aid|assistance/i;
const AUDIENCE_PATTERNS = Object.freeze({
  student: /student|scholar|fellow|education|school|college|university/i,
  women: /women|woman|girl|widow|maternity|pregnan/i,
  farmer: /farmer|agricultur|fisher|crop|livestock|dairy/i,
  worker: /worker|labour|labor|employment|job|intern|apprentice/i,
  senior: /senior|old age|elder|pension/i,
  entrepreneur: /entrepreneur|enterprise|business|startup|self-employ/i,
  disability: /disab|specially.abled|divyang/i,
});

function browseCategory(record) {
  if (record.kind === 'scholarship' || record.kind === 'scholarship_portal') return 'scholarship';
  if (['job', 'employment_scheme', 'internship'].includes(record.kind)) return 'job';
  return SERVICE_TITLE_PATTERN.test(record.title || record.name || '') ? 'service' : 'scheme';
}

function browseAudiences(record) {
  const title = record.title || record.name || '';
  const matches = Object.entries(AUDIENCE_PATTERNS).filter(([, pattern]) => pattern.test(title)).map(([key]) => key);
  return matches.length ? matches : ['general'];
}

function normalizeDiscovery(record) {
  return {
    id: record.id,
    kind: record.kind,
    publication_status: 'discovery_only',
    record_status: 'official_index_listing',
    browse_category: browseCategory(record),
    audiences: browseAudiences(record),
    title: record.title,
    name: record.title,
    description_en: 'Official listing on myScheme. Open the source for current eligibility, benefits and application details.',
    eligibility: [],
    documents_required: [],
    where_to_apply: 'Check eligibility and application steps on myScheme',
    official_url: record.official_detail_url,
    eligibility_check_url: record.eligibility_check_url,
    government_scope: record.government_scope,
    geography: { country: record.country || 'India', state: record.state || null },
    reviewed_on: record.source_checked_on || discoveryRepository.checked_on || null,
    helpline: null,
  };
}

function selectBrowseDiscovery(limitPerCategory = 40) {
  const buckets = { scheme: [], service: [], scholarship: [], job: [] };
  for (const record of discoveryRepository.records) buckets[browseCategory(record)].push(record);
  return Object.values(buckets).flatMap((bucket) => {
    const sorted = bucket.sort((a, b) => a.title.localeCompare(b.title, 'en-IN'));
    return Array.from({ length: Math.min(limitPerCategory, sorted.length) }, (_, index) => {
      const sourceIndex = Math.floor(index * sorted.length / Math.min(limitPerCategory, sorted.length));
      return normalizeDiscovery(sorted[sourceIndex]);
    });
  });
}

const LEGACY_ENTITIES = {
  'pm-kisan': { name: 'Department of Agriculture and Farmers Welfare', ministry: 'Ministry of Agriculture and Farmers Welfare', level: 'Central Government' },
  'ayushman-bharat': { name: 'National Health Authority', ministry: 'Ministry of Health and Family Welfare', level: 'Central Government' },
  'sukanya-samriddhi': { name: 'Department of Economic Affairs', ministry: 'Ministry of Finance', level: 'Central Government' },
  'pmay-g': { name: 'Department of Rural Development', ministry: 'Ministry of Rural Development', level: 'Central Government' },
  'mgnrega': { name: 'Department of Rural Development', ministry: 'Ministry of Rural Development', level: 'Central Government' },
  'ujjwala': { name: 'Ministry of Petroleum and Natural Gas', ministry: 'Ministry of Petroleum and Natural Gas', level: 'Central Government' },
  'nsap-old-age-pension': { name: 'Department of Rural Development', ministry: 'Ministry of Rural Development', level: 'Central Government' },
  'nsp-scholarship': { name: 'National Scholarship Portal', ministry: 'Ministry of Electronics and Information Technology', level: 'Central Government' },
};

const LEGACY_ALIASES = {
  'pm-kisan': ['PM-KISAN', 'Kisan Samman Nidhi'],
  'ayushman-bharat': ['PM-JAY', 'Ayushman Bharat', '70 plus health cover'],
  'sukanya-samriddhi': ['Sukanya Samriddhi Account', 'SSA'],
  'pmay-g': ['Pradhan Mantri Awaas Yojana Gramin', 'rural housing'],
  'mgnrega': ['Mahatma Gandhi National Rural Employment Guarantee Act', '100 days work'],
  'ujjwala': ['Pradhan Mantri Ujjwala Yojana', 'PMUY', 'LPG connection'],
  'nsap-old-age-pension': ['IGNOAPS', 'Indira Gandhi National Old Age Pension Scheme'],
  'nsp-scholarship': ['National Scholarship Portal', 'NSP'],
};

function normalizeLegacy(record) {
  const source = {
    url: record.official_url,
    title: `${record.name} official information`,
    publisher: LEGACY_ENTITIES[record.id]?.name || 'Government of India',
    checked_on: record.reviewed_on || null,
    primary: true,
  };
  return {
    id: record.id,
    kind: record.id === 'nsp-scholarship' ? 'scholarship_portal' : 'scheme',
    publication_status: 'published',
    application_status: 'check_official_source',
    title: record.name,
    name: record.name,
    aliases: LEGACY_ALIASES[record.id] || [],
    summary: record.description_en,
    description: record.description_en,
    description_en: record.description_en,
    scheme_description: record.description_en,
    job_description: null,
    scholarship_description: record.id === 'nsp-scholarship' ? record.description_en : null,
    government_entity: LEGACY_ENTITIES[record.id] || { name: 'Government of India', ministry: null, level: 'Central Government' },
    geography: { country: 'India', scope: 'All India', state: null, district: null, city: null, pincode: null },
    eligibility_text: record.eligibility || [],
    eligibility: record.eligibility || [],
    eligibility_rules: [],
    exclusions: record.exclusions || [],
    benefits: [],
    expectations: [],
    documents_required: record.documents_required || [],
    application: {
      method: record.where_to_apply || null,
      website: record.official_url,
      application_url: record.official_url,
      opens_on: null,
      deadline: null,
      deadline_note: record.id === 'nsp-scholarship' ? 'The portal does not have one scheme-wide deadline; check the notice for the specific scholarship and academic year.' : null,
    },
    where_to_apply: record.where_to_apply || null,
    official_url: record.official_url,
    contacts: record.helpline ? [{ name: null, job_title: 'Official helpline', phone: record.helpline, email: null, address: null, city: null, state: null, pincode: null }] : [],
    helpline: record.helpline || null,
    sources: [source],
    reviewed_on: record.reviewed_on || null,
  };
}

function normalizeRich(record) {
  const primarySource = (record.sources || []).find((source) => source.primary) || record.sources?.[0] || {};
  return {
    ...record,
    name: record.title,
    description_en: record.description || record.summary || '',
    scheme_description: record.kind === 'scheme' ? record.description || null : null,
    scholarship_description: record.kind === 'scholarship' ? record.description || null : null,
    eligibility: record.eligibility_text || [],
    exclusions: record.exclusions || [],
    where_to_apply: record.application?.method || record.application?.application_url || null,
    official_url: primarySource.url || record.application?.website || null,
    reviewed_on: primarySource.checked_on || seedRepository.checked_on || null,
    helpline: (record.contacts || []).map((contact) => contact.phone).filter(Boolean).join(' / ') || null,
  };
}

const LOCAL_PUBLISHED = Object.freeze([
  ...legacySchemes.map(normalizeLegacy),
  ...seedRepository.records.map(normalizeRich),
]);
const LOCAL_GENERAL_CONTEXT = Object.freeze(generalContextRepository.records.map(normalizeRich));
const LOCAL_BROWSE_DISCOVERY = Object.freeze(selectBrowseDiscovery());

let firestoreCache = null;
let firestoreCacheExpiresAt = 0;
let browseCache = null;
let browseCacheExpiresAt = 0;

async function readFirestorePublished() {
  const { getFirestore } = require('firebase-admin/firestore');
  const { firebaseAdminApp } = require('./serverSecurity');
  const db = getFirestore(firebaseAdminApp());
  const [opportunitySnapshot, generalSnapshot] = await Promise.all([
    db.collection('opportunities').where('publication_status', '==', 'published').limit(5000).get(),
    db.collection('general_context').where('publication_status', '==', 'published').limit(500).get(),
  ]);
  return [
    ...opportunitySnapshot.docs.map((doc) => normalizeRich({ id: doc.id, ...doc.data() })),
    ...generalSnapshot.docs.map((doc) => normalizeRich({ id: doc.id, ...doc.data() })),
  ];
}

async function getPublishedOpportunities() {
  if (process.env.OPPORTUNITY_SOURCE !== 'firestore') return [...LOCAL_PUBLISHED, ...LOCAL_GENERAL_CONTEXT];
  if (firestoreCache && Date.now() < firestoreCacheExpiresAt) return firestoreCache;
  try {
    firestoreCache = await readFirestorePublished();
    firestoreCacheExpiresAt = Date.now() + 5 * 60_000;
    if (firestoreCache.some((record) => record.kind !== 'official_directory')) return firestoreCache;
    throw new Error('Firestore contains no published opportunity records');
  } catch (error) {
    console.error('[repository] Firestore read failed; retrieval is unavailable', error?.message || error);
    throw error;
  }
}

async function readFirestoreBrowse() {
  const { getFirestore } = require('firebase-admin/firestore');
  const { firebaseAdminApp } = require('./serverSecurity');
  const db = getFirestore(firebaseAdminApp());
  const [publishedSnapshot, discoverySnapshot] = await Promise.all([
    db.collection('opportunities').where('publication_status', '==', 'published').limit(5000).get(),
    db.collection('opportunity_discovery').limit(500).get(),
  ]);
  return [
    ...publishedSnapshot.docs.map((doc) => ({ ...normalizeRich({ id: doc.id, ...doc.data() }), record_status: 'reviewed_record', browse_category: browseCategory(doc.data()), audiences: browseAudiences(doc.data()) })),
    ...discoverySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  ];
}

async function getBrowseOpportunities() {
  if (process.env.OPPORTUNITY_SOURCE !== 'firestore') {
    return [
      ...LOCAL_PUBLISHED.map((record) => ({ ...record, record_status: 'reviewed_record', browse_category: browseCategory(record), audiences: browseAudiences(record) })),
      ...LOCAL_BROWSE_DISCOVERY,
    ];
  }
  if (browseCache && Date.now() < browseCacheExpiresAt) return browseCache;
  browseCache = await readFirestoreBrowse();
  browseCacheExpiresAt = Date.now() + 5 * 60_000;
  if (browseCache.length < 100) throw new Error('Firestore browse catalogue is incomplete');
  return browseCache;
}

function buildRetrievalText(record) {
  return [
    record.title,
    ...(record.aliases || []),
    record.summary,
    record.description,
    record.job_description,
    ...(record.eligibility_text || []),
    ...(record.exclusions || []),
    ...(record.benefits || []),
    ...(record.expectations || []),
    ...(record.documents_required || []),
    record.government_entity?.name,
    record.government_entity?.ministry,
    record.geography?.state,
    record.geography?.city,
    record.application?.deadline_note,
  ].filter(Boolean).join('\n');
}

function buildChunks(record) {
  const sections = [
    ['overview', [record.title, record.summary, record.description, record.job_description]],
    ['eligibility', record.eligibility_text || []],
    ['benefits', record.benefits || []],
    ['expectations', record.expectations || []],
    ['documents', record.documents_required || []],
    ['application', [record.application?.method, record.application?.deadline_note]],
  ];
  return sections
    .map(([section, values]) => ({
      id: `${record.id}__${section}`,
      opportunity_id: record.id,
      section,
      language: 'en',
      text: (values || []).filter(Boolean).join('\n'),
      source_url: record.official_url,
      checked_on: record.reviewed_on,
      embedding_status: 'pending',
    }))
    .filter((chunk) => chunk.text);
}

module.exports = {
  getPublishedOpportunities,
  getBrowseOpportunities,
  getLocalPublishedOpportunities: () => LOCAL_PUBLISHED,
  getLocalBrowseDiscovery: () => LOCAL_BROWSE_DISCOVERY,
  getLocalGeneralContext: () => LOCAL_GENERAL_CONTEXT,
  getLocalRetrievalCorpus: () => [...LOCAL_PUBLISHED, ...LOCAL_GENERAL_CONTEXT],
  buildRetrievalText,
  buildChunks,
  normalizeLegacy,
  normalizeRich,
  normalizeDiscovery,
  browseCategory,
  browseAudiences,
};
