// ============================================================
// LAKESIDE FULFILLMENT — Health Check: /.netlify/functions/health
// Hit this URL anytime to confirm the full chain is alive.
// Returns green/red on each component.
// ============================================================

const https = require('https');

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwQP-IrLKgaoNbU7nQFMoQ1fMnAw70JaQdklbw20ZLVm1oAVBpIdY-NfgcTcHFKEGGN2w/exec';

function fetchURL(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: 'timeout' }), timeoutMs);
    const get = (u, redirects = 0) => {
      if (redirects > 5) { clearTimeout(timer); return resolve({ ok: false, error: 'too many redirects' }); }
      const lib = require(u.startsWith('https') ? 'https' : 'http');
      lib.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location, redirects + 1);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          clearTimeout(timer);
          resolve({ ok: res.statusCode < 400, status: res.statusCode, body: data.substring(0, 500) });
        });
      }).on('error', (e) => { clearTimeout(timer); resolve({ ok: false, error: e.message }); });
    };
    get(url);
  });
}

exports.handler = async function() {
  const checks = {};

  // Check Apps Script
  const as = await fetchURL(APPS_SCRIPT_URL);
  if (!as.ok) {
    checks.appsScript = { status: 'red', error: as.error || `HTTP ${as.status}` };
  } else {
    try {
      const match = as.body.match(/\{[\s\S]*/);
      const json = match ? JSON.parse(match[0]) : null;
      if (json && json.error) {
        checks.appsScript = { status: 'yellow', warning: json.error };
      } else if (json && json.stock) {
        checks.appsScript = { status: 'green', skus: json.stock.length };
      } else {
        checks.appsScript = { status: 'yellow', warning: 'Unexpected response shape' };
      }
    } catch(e) {
      checks.appsScript = { status: 'yellow', warning: 'JSON parse failed: ' + e.message };
    }
  }

  const overall = Object.values(checks).every(c => c.status === 'green') ? 'green'
                : Object.values(checks).some(c => c.status === 'red') ? 'red' : 'yellow';

  return {
    statusCode: overall === 'red' ? 503 : 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({
      overall,
      checks,
      _checked: new Date().toISOString(),
    }),
  };
};
