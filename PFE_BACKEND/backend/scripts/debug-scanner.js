const { runHexStrikeScan } = require('c:/Users/msi/Desktop/anti/PFE_BACKEND/backend/src/services/hexstrikeService');
const fs = require('fs');

async function debug() {
  console.log('Running debug scan...');
  try {
    const res = await runHexStrikeScan('http://demo.testfire.net', { mode: 'quick' });
    fs.writeFileSync('c:/Users/msi/Desktop/anti/PFE_BACKEND/backend/debug_scan_output.json', JSON.stringify(res, null, 2));
    console.log('Output saved to debug_scan_output.json');
  } catch (e) {
    console.error('Scan failed:', e);
  }
}

debug();
