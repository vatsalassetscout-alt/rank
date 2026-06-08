const axios = require('axios');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, keyword, country = 'us', domain } = req.body || {};

  if (!apiKey || !keyword || !domain) {
    return res.status(400).json({ 
      error: 'Missing required fields: apiKey, keyword, domain' 
    });
  }

  const cleanDomain = domain
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];

  try {
    const response = await axios.get('https://serpapi.com/search.json', {
      params: { 
        q: keyword, 
        gl: country, 
        hl: 'en', 
        num: 100, 
        api_key: apiKey 
      },
      timeout: 25000,
    });

    let position = -1;
    if (Array.isArray(response.data.organic_results)) {
      for (let i = 0; i < response.data.organic_results.length; i++) {
        const link = response.data.organic_results[i].link || '';
        const rd = link
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .split('/')[0];
        
        if (rd === cleanDomain || 
            rd === `www.${cleanDomain}` || 
            cleanDomain === `www.${rd}`) {
          position = i + 1;
          break;
        }
      }
    }

    return res.status(200).json({
      success: true,
      position,
      keyword,
      domain: cleanDomain,
      country,
      checkedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('SerpAPI error:', err.message);
    return res.status(500).json({ 
      error: err.message 
    });
  }
};
