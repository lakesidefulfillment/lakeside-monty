const CLIENTS = {
  monty: 'https://script.google.com/macros/s/AKfycbwQP-IrLKgaoNbU7nQFMoQ1fMnAw70JaQdklbw20ZLVm1oAVBpIdY-NfgcTcHFKEGGN2w/exec',
  thryv: 'https://script.google.com/macros/s/AKfycbxfSnY9-6emXvFhiLl2OCImMbR4kMxaaruZRs-bhdT1LQq5hy4RdJLeDprPMRnQbhWX/exec',
};

function fetchURL(url, timeoutMs = 25000) {
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
        res.on('end', () => { clearTimeout(timer); resolve({ ok: res.statusCode < 400, body: data }); });
      }).on('error', (e) => { clearTimeout(timer); resolve({ ok: false, error: e.message }); });
    };
    get(url);
  });
}

exports.handler = async function() {
  const checks = {};

  await Promise.all(Object.entries(CLIENTS).map(async ([name, url]) => {
    const res = await fetchURL(url);
    if (!res.ok) {
      checks[name] = { status: 'red', error: res.error || 'HTTP error' };
    } else {
      try {
        const match = res.body.match(/\{[\s\S]*/);
        const json = match ? JSON.parse(match[0]) : null;
        if (json && json.error) checks[name] = { status: 'yellow', warning: json.error };
        else if (json && json.stock) checks[name] = { status: 'green', skus: json.stock.length };
        else checks[name] = { status: 'yellow', warning: 'Unexpected response shape' };
      } catch(e) {
        checks[name] = { status: 'yellow', warning: 'JSON parse failed: ' + e.message };
      }
    }
  }));

  const overall = Object.values(checks).every(c => c.status === 'green') ? 'green'
                : Object.values(checks).some(c => c.status === 'red') ? 'red' : 'yellow';

  return {
    statusCode: overall === 'red' ? 503 : 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ overall, checks, _checked: new Date().toISOString() }),
  };
};
