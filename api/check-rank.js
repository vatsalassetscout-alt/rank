const axios = require('axios');
const { google } = require('googleapis');

// Google Sheets setup
let sheetsAuth = null;
let spreadsheetId = 'YOUR_SPREADSHEET_ID'; // Get from sheet URL

async function initGoogleSheets() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'path-to-your-service-account-key.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    sheetsAuth = await auth.getClient();
    return google.sheets({ version: 'v4', auth: sheetsAuth });
  } catch (error) {
    console.error('Google Sheets auth error:', error);
    return null;
  }
}

// Read trackers from Google Sheets
async function getTrackersFromSheet() {
  try {
    const sheets = await initGoogleSheets();
    if (!sheets) return [];

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Trackers!A:F', // Sheet name and columns
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return []; // Skip header row

    // Convert rows to tracker objects
    return rows.slice(1).map(row => ({
      id: row[0],
      domain: row[1],
      keyword: row[2],
      country: row[3],
      pos: row[4] === 'null' ? null : parseInt(row[4]),
      checked: row[5]
    }));
  } catch (error) {
    console.error('Error reading sheet:', error);
    return [];
  }
}

// Save trackers to Google Sheets
async function saveTrackersToSheet(trackers) {
  try {
    const sheets = await initGoogleSheets();
    if (!sheets) return false;

    // Prepare data for sheet
    const values = [
      ['ID', 'Domain', 'Keyword', 'Country', 'Position', 'Last Checked'], // Header
      ...trackers.map(t => [
        t.id,
        t.domain,
        t.keyword,
        t.country,
        t.pos === null ? 'null' : t.pos,
        t.checked || ''
      ])
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Trackers!A:F',
      valueInputOption: 'RAW',
      resource: { values }
    });

    return true;
  } catch (error) {
    console.error('Error saving to sheet:', error);
    return false;
  }
}

// Update single tracker position
async function updateTrackerPosition(id, position, checkedAt) {
  const trackers = await getTrackersFromSheet();
  const index = trackers.findIndex(t => t.id === id);
  
  if (index !== -1) {
    trackers[index].pos = position;
    trackers[index].checked = checkedAt;
    await saveTrackersToSheet(trackers);
  }
}

// Express routes
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { 
    res.status(200).end(); 
    return; 
  }

  // New endpoint: Get all trackers
  if (req.method === 'GET' && req.url === '/api/get-trackers') {
    const trackers = await getTrackersFromSheet();
    return res.status(200).json({ trackers });
  }

  // New endpoint: Save all trackers
  if (req.method === 'POST' && req.url === '/api/save-trackers') {
    const { trackers } = req.body;
    await saveTrackersToSheet(trackers);
    return res.status(200).json({ success: true });
  }

  // New endpoint: Add tracker
  if (req.method === 'POST' && req.url === '/api/add-tracker') {
    const { id, domain, keyword, country } = req.body;
    const trackers = await getTrackersFromSheet();
    trackers.push({ id, domain, keyword, country, pos: null, checked: null });
    await saveTrackersToSheet(trackers);
    return res.status(200).json({ success: true });
  }

  // New endpoint: Delete tracker
  if (req.method === 'POST' && req.url === '/api/delete-tracker') {
    const { id } = req.body;
    const trackers = await getTrackersFromSheet();
    const filtered = trackers.filter(t => t.id !== id);
    await saveTrackersToSheet(filtered);
    return res.status(200).json({ success: true });
  }

  // Existing endpoint: Check rank
  if (req.method !== 'POST' || req.url !== '/api/check-rank') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { apiKey, keyword, country = 'us', domain } = req.body || {};

  if (!apiKey || !keyword || !domain) {
    return res.status(400).json({
      error: 'Missing required fields: apiKey, keyword, domain',
    });
  }

  const cleanDomain = domain
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];

  try {
    const response = await axios.get('https://serpapi.com/search.json', {
      params: { q: keyword, gl: country, hl: 'en', num: 100, api_key: apiKey },
      timeout: 25000,
      headers: { Accept: 'application/json', 'User-Agent': 'RankPulse/1.0' },
    });

    const data = response.data;

    if (data.error) {
      return res.status(400).json({ error: data.error });
    }

    let position = -1;
    if (Array.isArray(data.organic_results)) {
      for (let i = 0; i < data.organic_results.length; i++) {
        const link = data.organic_results[i].link || '';
        const rd = link.toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .split('/')[0];
        if (
          rd === cleanDomain ||
          rd === `www.${cleanDomain}` ||
          cleanDomain === `www.${rd}` ||
          rd.endsWith(`.${cleanDomain}`)
        ) {
          position = i + 1;
          break;
        }
      }
    }

    // Update position in Google Sheets if we have the tracker ID
    if (req.body.trackerId) {
      await updateTrackerPosition(req.body.trackerId, position, new Date().toISOString());
    }

    return res.status(200).json({
      success: true,
      position,
      keyword,
      domain: cleanDomain,
      country,
      totalResults: data.search_information?.total_results ?? null,
      checkedAt: new Date().toISOString(),
    });

  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Request timed out. Try again.' });
    }
    if (err.response) {
      return res.status(err.response.status).json({
        error: `SerpAPI error ${err.response.status}`,
        details: err.response.data,
      });
    }
    if (err.request) {
      return res.status(503).json({ error: 'Cannot reach SerpAPI. Check your key and connection.' });
    }
    return res.status(500).json({ error: err.message });
  }
};
