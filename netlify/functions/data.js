// ============================================================
// LAKESIDE FULFILLMENT — Netlify Function: /api/data
// Hardened version — validates shape, surfaces real errors
// ============================================================

const https = require('https');
const { STOCK_COLS, INBOUND_COLS } = require('./config');

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwQP-IrLKgaoNbU7nQFMoQ1fMnAw70JaQdklbw20ZLVm1oAVBpIdY-NfgcTcHFKEGGN2w/exec';

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
        res.on('end', () => resolve({ body: data, status: res.statusCode }));
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

function validateAppsData(data) {
  const errors = [];
  if (!data || typeof data !== 'object') errors.push('Apps Script returned non-object');
  if (data.error) errors.push('Apps Script error: ' + data.error);
  if (!Array.isArray(data.stock)) errors.push('Missing stock array');
  if (!Array.isArray(data.inbound)) errors.push('Missing inbound array');
  if (data.stock && data.stock.length > 0) {
    const required = Object.values(STOCK_COLS);
    const actual = Object.keys(data.stock[0]);
    const missing = required.filter(c => !actual.includes(c));
    if (missing.length > 0) errors.push('Stock missing columns: ' + missing.join(', '));
  }
  return errors;
}

exports.handler = async function(event, context) {
  const warnings = [];

  try {
    const [appsResult, ordersResult] = await Promise.all([
      fetchURL(APPS_SCRIPT_URL),
      fetchURL(ORDERS_URL),
    ]);

    // --- Parse Apps Script ---
    let appsData = {};
    try {
      const jsonMatch = appsResult.body.match(/\{[\s\S]*\}/);
      if (jsonMatch) appsData = JSON.parse(jsonMatch[0]);
      else throw new Error('No JSON found in Apps Script response');
    } catch(e) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Apps Script parse failed: ' + e.message, _healthy: false }),
      };
    }

    // --- Validate Apps Script data shape ---
    const validationErrors = validateAppsData(appsData);
    if (validationErrors.length > 0) {
      return {
        statusCode: 422,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Data validation failed', details: validationErrors, _healthy: false }),
      };
    }

    const apiData = {};
    Object.entries(appsData).forEach(([k, v]) => {
      if (k !== 'stock' && k !== 'inbound' && k !== '_schemaVersion' && k !== '_timestamp') {
        apiData[k] = typeof v === 'number' ? v : parseNum(String(v || ''));
      }
    });

    const stock = appsData.stock || [];
    const inbound = appsData.inbound || [];

    // --- Parse Orders CSV ---
    let orders = [];
    if (ordersResult.body && !ordersResult.body.includes('<!DOCTYPE')) {
      try {
        const ordersRows = parseCSV(ordersResult.body);
        const ordersHeaders = ordersRows[0].map(h => clean(h));
        orders = ordersRows.slice(1).map(row => {
          const o = {}; ordersHeaders.forEach((h, i) => o[h] = clean(row[i] || '')); return o;
        }).filter(r => r.Date || r.date);
      } catch(e) {
        warnings.push('Orders CSV parse failed: ' + e.message);
      }
    } else {
      warnings.push('Orders CSV unavailable');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60',
      },
      body: JSON.stringify({ apiData, stock, inbound, orders, _healthy: true, warnings }),
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message, _healthy: false }),
    };
  }
};
