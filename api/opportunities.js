const { secureEndpoint } = require('../lib/serverSecurity');
const { getBrowseOpportunities } = require('../lib/opportunityRepository');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  const identity = await secureEndpoint(req, res);
  if (!identity) return;

  try {
    const records = await getBrowseOpportunities();
    return res.status(200).json(records.map((record) => ({
      id: record.id,
      kind: record.kind,
      name: record.name || record.title,
      description_en: record.description_en || record.description || record.summary || '',
      eligibility: record.eligibility || record.eligibility_text || [],
      documents_required: record.documents_required || [],
      where_to_apply: record.where_to_apply || record.application?.method || record.application?.application_url || null,
      official_url: record.official_url,
      helpline: record.helpline,
      reviewed_on: record.reviewed_on,
      record_status: record.record_status || 'reviewed_record',
      category: record.browse_category || 'scheme',
      audiences: record.audiences || ['general'],
      government_scope: record.government_scope || record.geography?.scope || null,
      state: record.geography?.state || null,
      eligibility_check_url: record.eligibility_check_url || null,
    })));
  } catch (error) {
    console.error('opportunities error', error);
    return res.status(500).json({ error: 'opportunities_failed' });
  }
};
