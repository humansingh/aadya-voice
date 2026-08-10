#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

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

async function commitInBatches(db, records) {
  for (let offset = 0; offset < records.length; offset += 400) {
    const batch = db.batch();
    for (const record of records.slice(offset, offset + 400)) {
      batch.set(db.collection('opportunity_discovery').doc(record.id), {
        ...record,
        schema_version: '1.0',
        updated_at: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    console.log(`Committed ${Math.min(offset + 400, records.length)} of ${records.length} browse listings`);
  }
}

async function main() {
  loadEnv();
  const { firebaseAdminApp } = require('../lib/serverSecurity');
  const { getLocalBrowseDiscovery } = require('../lib/opportunityRepository');
  const records = getLocalBrowseDiscovery();
  const counts = records.reduce((all, record) => ({ ...all, [record.browse_category]: (all[record.browse_category] || 0) + 1 }), {});
  console.log(`Prepared ${records.length} official browse listings: ${JSON.stringify(counts)}.`);
  if (!APPLY) {
    console.log('Dry run only. Re-run with --apply to write the separate browse-only collection.');
    return;
  }
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS before using --apply.');
  }
  const db = getFirestore(firebaseAdminApp());
  await commitInBatches(db, records);
  await db.collection('ingestion_runs').add({
    type: 'browse_discovery_import',
    status: 'succeeded',
    record_count: records.length,
    category_counts: counts,
    created_at: FieldValue.serverTimestamp(),
  });
  console.log('Browse listings imported. They are not added to opportunities or retrieval chunks.');
}

main().catch((error) => { console.error(error); process.exit(1); });
