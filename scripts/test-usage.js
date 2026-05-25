// Simple smoke test for /api/usage endpoint
// Usage: node scripts/test-usage.js

const fetch = globalThis.fetch || require('node-fetch');

async function run() {
  const url = process.env.URL || 'http://localhost:3000/api/usage';
  console.log('Testing GET', url);
  try {
    const res = await fetch(url, { method: 'GET' });
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text);
    if (res.status === 401) {
      console.log('OK: endpoint requires authentication (expected).');
    } else if (res.status === 200) {
      console.log('OK: endpoint returned 200 (requires a valid access token to fully test).');
    } else {
      console.warn('Unexpected status; inspect response above.');
    }
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

run();
