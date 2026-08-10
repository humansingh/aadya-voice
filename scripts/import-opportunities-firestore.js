#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { firebaseAdminApp } = require('../lib/serverSecurity');
const { getLocalPublishedOpportunities, getLocalGeneralContext, buildChunks } = require('../lib/opportunityRepository');
const sourceRegistry = require('../data/master/source-registry.json');

const ROOT = path.join(__dirname, '..');
const APPLY = process.argv.includes('--apply');

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const split = line.indexOf('=');
    const key = line.slice(0, split).trim();
    const value = line.slice(split + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function sourceId(url) {
  return crypto.createHash('sha256').update(url).digest('hex').slice(0, 24);
}

function firestoreSafe(value) {
  if (Array.isArray(value)) return value.map(firestoreSafe);
  if (!value || typeof value !== 'object') return value === undefined ? null : value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, firestoreSafe(child)]));
}

async function commitInBatches(db, writes) {
  for (let offset = 0; offset < writes.length; offset += 400) {
    const batch = db.batch();
    for (const write of writes.slice(offset, offset + 400)) batch.set(write.ref, write.data, { merge: write.merge ?? false });
    await batch.commit();
    console.log(`Committed ${Math.min(offset + 400, writes.length)} of ${writes.length} writes`);
  }
}

async function main() {
  loadEnv();
  const opportunities = getLocalPublishedOpportunities();
  const generalContext = getLocalGeneralContext();
  const chunks = [...opportunities, ...generalContext].flatMap(buildChunks);
  const sources = new Map();
  for (const opportunity of [...opportunities, ...generalContext]) {
    for (const source of opportunity.sources || []) sources.set(source.url, source);
  }

  console.log(`Prepared ${opportunities.length} published opportunities, ${generalContext.length} verified general-context records, ${chunks.length} retrieval chunks, ${sources.size} cited sources, and ${sourceRegistry.length} ingestion sources.`);
  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply after selecting the Firebase project and providing server credentials.');
    return;
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS before using --apply.');
  }

  const db = getFirestore(firebaseAdminApp());
  const writes = [];
  for (const opportunity of opportunities) {
    const data = { ...firestoreSafe(opportunity), schema_version: '1.0', updated_at: FieldValue.serverTimestamp() };
    writes.push({ ref: db.collection('opportunities').doc(opportunity.id), data });
    writes.push({
      ref: db.collection('opportunity_versions').doc(`${opportunity.id}__${opportunity.reviewed_on || 'undated'}`),
      data: { ...firestoreSafe(opportunity), opportunity_id: opportunity.id, schema_version: '1.0', imported_at: FieldValue.serverTimestamp() },
    });
  }
  for (const record of generalContext) {
    writes.push({
      ref: db.collection('general_context').doc(record.id),
      data: { ...firestoreSafe(record), schema_version: '1.0', updated_at: FieldValue.serverTimestamp() },
    });
  }
  for (const chunk of chunks) writes.push({ ref: db.collection('opportunity_chunks').doc(chunk.id), data: firestoreSafe(chunk) });
  for (const [url, source] of sources) writes.push({ ref: db.collection('sources').doc(sourceId(url)), data: firestoreSafe({ ...source, url }) });
  for (const source of sourceRegistry) writes.push({ ref: db.collection('ingestion_sources').doc(source.id), data: firestoreSafe(source) });
  await commitInBatches(db, writes);

  await db.collection('ingestion_runs').add({
    type: 'manual_seed_import',
    status: 'succeeded',
    opportunity_count: opportunities.length,
    general_context_count: generalContext.length,
    chunk_count: chunks.length,
    source_count: sources.size,
    created_at: FieldValue.serverTimestamp(),
  });
  console.log('Firestore import completed. Set OPPORTUNITY_SOURCE=firestore on the server to query it at runtime.');
}

main().catch((error) => { console.error(error); process.exit(1); });
