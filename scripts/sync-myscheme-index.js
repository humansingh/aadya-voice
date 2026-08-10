const fs = require('fs');
const path = require('path');

const INDEX_URL = 'https://rules.myscheme.gov.in/';
const OUTPUT = path.join(__dirname, '..', 'data', 'master', 'myscheme-index.json');

function classify(title) {
  const value = title.toLowerCase();
  if (/scholarship|fellowship|chhatrav|stipend|students?/.test(value)) return 'scholarship';
  if (/internship/.test(value)) return 'internship';
  if (/employment|unemployment|job|recruit|rozgar|rojgar/.test(value)) return 'employment_scheme';
  return 'scheme';
}

async function main() {
  const response = await fetch(INDEX_URL, { headers: { 'User-Agent': 'AadyaSourceIndexer/1.0' } });
  if (!response.ok) throw new Error(`myScheme index returned ${response.status}`);
  const html = await response.text();
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('myScheme index did not contain __NEXT_DATA__');
  const payload = JSON.parse(match[1]);
  const schemes = payload?.props?.pageProps?.schemes;
  if (!Array.isArray(schemes) || schemes.length < 1000) throw new Error('myScheme index was unexpectedly small');
  const checkedOn = new Date().toISOString().slice(0, 10);
  const records = schemes.map(({ name, slug }) => ({
    id: `myscheme-${slug}`,
    title: String(name || '').trim(),
    slug,
    kind: classify(String(name || '')),
    publication_status: 'discovery_only',
    government_scope: 'central_or_state',
    country: 'India',
    state: null,
    official_detail_url: `https://www.myscheme.gov.in/schemes/${slug}`,
    eligibility_check_url: `https://rules.myscheme.gov.in/en/check-eligibility/${slug}?source=myscheme`,
    discovery_source_url: INDEX_URL,
    source_checked_on: checkedOn,
  }));
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify({ schema_version: '1.0', source: INDEX_URL, checked_on: checkedOn, record_count: records.length, records }, null, 2));
  console.log(`Wrote ${records.length} discovery records to ${OUTPUT}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
