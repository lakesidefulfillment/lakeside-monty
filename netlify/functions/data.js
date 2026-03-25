const https = require('https');

const SHEET_URLS = {
  API: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR6J6k1mNgNeyCPtP-f30ARDrGVNUEBc-vLhhNSORj1lqT-G-k69ixZS58teHi6czLEJxJiyuiQWmHa/pub?gid=1158528977&single=true&output=csv',
  Stock: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR6J6k1mNgNeyCPtP-f30ARDrGVNUEBc-vLhhNSORj1lqT-G-k69ixZS58teHi6czLEJxJiyuiQWmHa/pub?gid=295677401&single=true&output=csv',
  Inbound: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR6J6k1mNgNeyCPtP-f30ARDrGVNUEBc-vLhhNSORj1lqT-G-k69ixZS58teHi6czLEJxJiyuiQWmHa/pub?gid=1389641724&single=true&output=csv',
};

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const get = (u, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location, redirects + 1);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    };
    get(url);
  });
}

function parseCSV(text) {
  const rows = [];
  const lines = text.trim().split('\n');
  for (const line of lines) {
    const cols = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += c; }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

function clean(s) { return (s || '').replace(/"/g, '').trim(); }
function parseNum(s) {
  const v = (s || '').replace(/[$,"\s]/g, '');
  return isNaN(v) || v === '' ? 0 : parseFloat(v);
}

exports.handler = async function(event, context) {
  try {
    const [apiCSV, stockCSV, inboundCSV] = await Promise.all([
      fetchURL(SHEET_URLS.API),
      fetchURL(SHEET_URLS.Stock),
      fetchURL(SHEET_URLS.Inbound),
    ]);

    const apiData = {};
    parseCSV(apiCSV).forEach(r => {
      const key = clean(r[0]), val = clean(r[1]);
      if (key && key !== 'key') {
        const num = parseNum(val);
        apiData[key] = num !== 0 ? num : val;
      }
    });

    const stockRows = parseCSV(stockCSV);
    const stockHeaders = stockRows[0].map(h => clean(h));
    const stock = stockRows.slice(1).map(row => {
      const o = {}; stockHeaders.forEach((h, i) => o[h] = clean(row[i] || '')); return o;
    }).filter(r => r.SKU || r.sku);

    const inbRows = parseCSV(inboundCSV);
    const inbHeaders = inbRows[0].map(h => clean(h));
    const inbound = inbRows.slice(1).map(row => {
      const o = {}; inbHeaders.forEach((h, i) => o[h] = clean(row[i] || '')); return o;
    }).filter(r => r.Date || r.SKU || r.date || r.sku);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
      body: JSON.stringify({ apiData, stock, inbound }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
