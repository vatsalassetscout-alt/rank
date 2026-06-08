const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.static('.')); // Serve your HTML file

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// The rank checking endpoint
app.post('/api/check-rank', async (req, res) => {
  console.log('Received request:', req.body);
  
  const { apiKey, keyword, country = 'us', domain } = req.body;

  if (!apiKey || !keyword || !domain) {
    return res.status(400).json({ 
      error: 'Missing required fields: apiKey, keyword, domain' 
    });
  }

  const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

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
        const rd = link.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        
        if (rd === cleanDomain || rd === `www.${cleanDomain}` || cleanDomain === `www.${rd}`) {
          position = i + 1;
          break;
        }
      }
    }

    return res.json({
      success: true,
      position: position,
      keyword: keyword,
      domain: cleanDomain,
      country: country,
      checkedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Server running at: http://localhost:${PORT}`);
  console.log(`📊 Open this URL in your browser: http://localhost:${PORT}/index.html\n`);
});
