const https = require('https');

// Apps Script serves API + Stock + Inbound data — no auth issues
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwQP-IrLKgaoNbU7nQFMoQ1fMnAw70JaQdklbw20ZLVm1oAVBpIdY-NfgcTcHFKEGGN2w/exec';

// Orders CSV — published, working fine
const ORDERS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR6J6k1mNgNeyCPtP-f30ARDrGVNUEBc-vLhhNSORj1lqT-G-k69ixZS58teHi6czLEJxJiyuiQWmHa/pub?gid=205851154&single=true&output=csv';

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    const get = (u, redirects = 0) => {
      if (redirects > 10) return reject(new Error('Too many redirects'));
      const lib = require(u.startsWith('https') ? 'https' : 'http');
      lib.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
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
  const v = (s || '').toString().replace(/[$,"\s]/g, '');
  return isNaN(v) || v === '' ? 0 : parseFloat(v);
}

exports.handler = async function(event, context) {
  try {
    const [appsScriptText, ordersCSV] = await Promise.all([
      fetchURL(APPS_SCRIPT_URL),
      fetchURL(ORDERS_URL),
    ]);

    // Parse Apps Script JSON
    let appsData = {};
    try {
      const jsonMatch = appsScriptText.match(/\{[\s\S]*\}/);
      if (jsonMatch) appsData = JSON.parse(jsonMatch[0]);
    } catch(e) {
      console.log('Apps Script parse error:', e.message, appsScriptText.substring(0, 200));
    }

    // Build apiData from Apps Script key/value pairs
    const apiData = {};
    Object.entries(appsData).forEach(([k, v]) => {
      if (k !== 'stock' && k !== 'inbound') {
        apiData[k] = typeof v === 'number' ? v : parseNum(String(v || ''));
      }
    });

    const stock = appsData.stock || [];
    const inbound = appsData.inbound || [];

    // Parse Orders CSV
    let orders = [];
    if (ordersCSV && !ordersCSV.includes('<!DOCTYPE')) {
      const ordersRows = parseCSV(ordersCSV);
      const ordersHeaders = ordersRows[0].map(h => clean(h));
      orders = ordersRows.slice(1).map(row => {
        const o = {}; ordersHeaders.forEach((h, i) => o[h] = clean(row[i] || '')); return o;
      }).filter(r => r.Date || r.date);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
      body: JSON.stringify({ apiData, stock, inbound, orders }),
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
