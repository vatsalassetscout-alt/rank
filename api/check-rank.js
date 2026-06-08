const axios = require('axios');
const { google } = require('googleapis');

// ========== GOOGLE SHEETS SETUP ==========
const SERVICE_ACCOUNT_JSON = {
  "type": "service_account",
  "project_id": "gsc-dashboard-490611",
  "private_key_id": "c5e9764f8be99a8e50d56240d7d3ddd82c6a3b2c",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDPmlwNU1qDzfyH\npEDuaLyiF1D+T7v6G0zUClBuvccvxTVKlCqsd86brXV2tiDp7BJoGfSkioN30VUt\nlBMWyRjSeDKelVFtzwsOyPY2vIy3WHLVXP4CtG3deEdwwHU4OLGLNvUuxrQgKbxO\nijZaQzwfIM98yR6J9tLZoo0JGIzNOPx+crPSgiMd4lbtmvsHznFSuwVQhzqO0Dgp\nPiDrMuGUrlKZTyLODBkfMXKzx3aQ95YjLHqbQJI2VOEj9U54khUtpg1M6LCEP3G4\n8b8WFdaXWE0Xd1n3lUWhtXLCVSKXzp7lp9JtrfBXZ2JpGOdan0vLUGUu3IXo/Pu7\nowbzlSK9AgMBAAECggEAL7PlYP59NvoXA8f/T4jrh0daSgViSTcKsVJpZvjekyB6\nfVeMcrLY27bA3fU9nOKs3BTSvRhC2z5TlzSGKl8s//e0kfH3kwbXIJ+Wy78Jinud\nb1990ntJH3Gq4MKobLHCQh3vur7X1uggJ9/kW1tFrlVot+CyzrrTekS6qZNljyYV\nyuVEuUbqHevpKjN2UNrc3cuY0QuGbfFuKBc79NScgBfX6qxp/5Wu1xbI45/MlZVO\ngGTvyCqaUcPd6L3ug6/tDN+VeL0U1NnXZM3cxf93JioKa/Rs/vuyuhOQQQwLKANY\nRVX8HoGwZNPoRL+4Sa4MWxPRtPQZGNWriiVIOFvCtQKBgQD4KxZLLoaQ+FIyozzY\nw6LKV91lyqFWozlZm5/1uE3NkL8mcT0iQw392wsUYC0u1g14m7Q1QiJo3KfxdldD\nNR1kkXPx0qdqvKlQ8zk0XSK4/yxpPBiaY2W8P2OkIXnUmnQ1ZbpzmlrZXJFHmJCE\nlKF5zzdJ5d2CzyyTQmH8phym4wKBgQDWJ40rr98oU2TgNFNHeTT0tXbzcK0rwONi\nPeYt2YRpZLVSbmjtfHaTrf88PCpMiNoZn9K08zbnrH7SQhiowZHiDIlg4dv+vRYM\nH6U8vyrjswt+2BvWhYl8ztu853gBXt9c23eAyGFE8EHhwIlAkCFiG1/ucYtCddIr\nco8l6pmh3wKBgGO73S/FuOrWASK8m515shijiyR3dLN+0XODqZt0wD/W5hsq8yir\nzhmxSBieNkpWV/+ag6fLtkxyMURHDPbDh9Z85h3PTN0GiP0xYlH7BBNY6Z45OqIB\nREeNKhwyH+YjVISJJ4+B/vTP0Mr3M0009lgfwNZ//K+vVvivevWwRF+FAoGBAI0Y\nc/eDoWjlQQJDF1dw8UYFRUDxTPcV1/qDQ+OTe50g4CJWYkWOCmYUbqSWE1xnkiLt\n3RqhX9xWFxyatbqCBobDscOmK5bzp9IHC4wxe6WX8ov5AKZfRw13EOmuK6/jfRCl\n/F9aJlQQY6fEfemOzJ/h31uvbYw1Kmq7yLq3jc9LAoGBAMV1h5ZcWj1BednQTDUl\nzLWXgku+ykuec+szm50fUx05uu9UbatgAnaIGma4RNro14N3ztrq3RUIZmGe3V0J\n/S7hAF69CKn1ul9MgglmwZSuONEUsaV/Rbhb00hcQKiln1rRzwvoDg+FPUz+Jekd\ncl1LGN2dXec3OK+BN7FNbklw\n-----END PRIVATE KEY-----\n",
  "client_email": "rank-tracker@gsc-dashboard-490611.iam.gserviceaccount.com",
  "client_id": "106401473989273140192",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/rank-tracker%40gsc-dashboard-490611.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

const SPREADSHEET_ID = '1GhLMTjKZh2t-pMTLPUKIGkG47phWn2FNh823-phqhAs';

let sheetsClient = null;

async function initGoogleSheets() {
  try {
    let auth;
    
    if (SERVICE_ACCOUNT_JSON.private_key) {
      auth = new google.auth.GoogleAuth({
        credentials: SERVICE_ACCOUNT_JSON,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else if (process.env.GOOGLE_CREDENTIALS) {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
      auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else {
      console.error('No Google credentials found!');
      return null;
    }
    
    const authClient = await auth.getClient();
    sheetsClient = google.sheets({ version: 'v4', auth: authClient });
    console.log('✅ Google Sheets connected successfully');
    return sheetsClient;
  } catch (error) {
    console.error('❌ Google Sheets auth error:', error.message);
    return null;
  }
}

async function getTrackersFromSheet() {
  try {
    if (!sheetsClient) await initGoogleSheets();
    if (!sheetsClient) return [];

    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:F',
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    return rows.slice(1).map(row => ({
      id: row[0] || '',
      domain: row[1] || '',
      keyword: row[2] || '',
      country: row[3] || 'us',
      pos: row[4] === 'null' || !row[4] ? null : parseInt(row[4]),
      checked: row[5] || null
    }));
  } catch (error) {
    console.error('Error reading sheet:', error.message);
    return [];
  }
}

async function saveTrackersToSheet(trackers) {
  try {
    if (!sheetsClient) await initGoogleSheets();
    if (!sheetsClient) return false;

    const values = [
      ['ID', 'Domain', 'Keyword', 'Country', 'Position', 'Last Checked'],
      ...trackers.map(t => [
        t.id,
        t.domain,
        t.keyword,
        t.country,
        t.pos === null ? 'null' : t.pos,
        t.checked || ''
      ])
    ];

    await sheetsClient.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:F',
    });

    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A:F',
      valueInputOption: 'RAW',
      resource: { values }
    });

    console.log(`✅ Saved ${trackers.length} trackers to Google Sheets`);
    return true;
  } catch (error) {
    console.error('Error saving to sheet:', error.message);
    return false;
  }
}

// ========== SERVERLESS HANDLER ==========
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { 
    res.status(200).end(); 
    return; 
  }

  const url = req.url;
  const method = req.method;

  if (method === 'GET' && url === '/api/get-trackers') {
    const trackers = await getTrackersFromSheet();
    return res.status(200).json({ trackers });
  }

  if (method === 'POST' && url === '/api/save-trackers') {
    const { trackers } = req.body;
    await saveTrackersToSheet(trackers);
    return res.status(200).json({ success: true });
  }

  if (method === 'POST' && url === '/api/add-tracker') {
    const { id, domain, keyword, country } = req.body;
    const trackers = await getTrackersFromSheet();
    trackers.push({ id, domain, keyword, country, pos: null, checked: null });
    await saveTrackersToSheet(trackers);
    return res.status(200).json({ success: true });
  }

  if (method === 'POST' && url === '/api/delete-tracker') {
    const { id } = req.body;
    const trackers = await getTrackersFromSheet();
    const filtered = trackers.filter(t => t.id !== id);
    await saveTrackersToSheet(filtered);
    return res.status(200).json({ success: true });
  }

  if (method === 'POST' && url === '/api/update-tracker') {
    const { id, position, checkedAt } = req.body;
    const trackers = await getTrackersFromSheet();
    const index = trackers.findIndex(t => t.id === id);
    if (index !== -1) {
      trackers[index].pos = position;
      trackers[index].checked = checkedAt;
      await saveTrackersToSheet(trackers);
    }
    return res.status(200).json({ success: true });
  }

  if (method !== 'POST' || url !== '/api/check-rank') {
    return res.status(404).json({ error: 'Endpoint not found' });
  }

  const { apiKey, keyword, country = 'us', domain, trackerId } = req.body || {};

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

    if (trackerId) {
      const trackers = await getTrackersFromSheet();
      const index = trackers.findIndex(t => t.id === trackerId);
      if (index !== -1) {
        trackers[index].pos = position;
        trackers[index].checked = new Date().toISOString();
        await saveTrackersToSheet(trackers);
      }
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
    console.error('SerpAPI error:', err.message);
    if (err.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Request timed out. Try again.' });
    }
    if (err.response) {
      return res.status(err.response.status).json({
        error: `SerpAPI error ${err.response.status}`,
        details: err.response.data,
      });
    }
    return res.status(500).json({ error: err.message });
  }
};
