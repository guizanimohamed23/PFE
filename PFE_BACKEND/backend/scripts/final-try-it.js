const scanNormalizationService = require('../src/services/scanNormalizationService');

const MOCK_INPUT = {
  target: "http://demo.testfire.net",
  tools_executed: [
    {
      tool: "sqlmap",
      stdout: "[INFO] Testing 'OR 1=1' in login\n[!] Gid=0(root) uid=0(root)\n[+] Database is MySQL",
      vulnerabilities_found: 1
    },
    {
      tool: "nuclei",
      stdout: "[aws-metadata-ssrf] [critical] http://demo.testfire.net/proxy?url=http://169.254.169.254\n[jwt-none-algo] [high] Found base64 JWT with alg:none",
      vulnerabilities_found: 2
    },
    {
      tool: "dirsearch",
      stdout: ":: [200] http://demo.testfire.net/.env\n:: [403] http://demo.testfire.net/admin",
      vulnerabilities_found: 1
    },
    {
      tool: "nmap-passive",
      stdout: "X-Powered-By: Django/3.2.1\nAWS_SECRET_KEY=AKIAJKFDLASKJFDLASKJF\nSet-Cookie: csrftoken=abc123xyz...",
      vulnerabilities_found: 1
    },
    {
      tool: "noise-tool",
      stdout: ":: Progress: [99%] :: Speed: 100/s :: Errors: 10\nConnection timed out for chunk 42",
      stderr: "Traceback: line 10, in scanner.py",
      vulnerabilities_found: 0
    }
  ]
};

console.log("--- STARTING ENHANCED SCAN NORMALIZATION TEST ---\n");
const result = scanNormalizationService.normalizeHexstrikeResultsDetailed(MOCK_INPUT);

console.log(`Summary: Captured ${result.findings.length} findings, Dropped ${result.stats.droppedFindings} noise items.`);

console.log("\n--- CAPTURED FINDINGS ---");
result.findings.forEach((f, i) => {
  console.log(`\nFINDING #${i+1}`);
  console.log(`Title:    [${f.severity.toUpperCase()}] ${f.title}`);
  console.log(`Evidence: ${f.evidence.substring(0, 100).replace(/\n/g, ' ')}...`);
});

console.log("\n--- NOISE SUPPRESSION CHECK ---");
const leakedNoise = result.findings.filter(f => f.evidence.includes("Progress") || f.evidence.includes("Traceback"));
console.log(`Noise leaked to results: ${leakedNoise.length > 0 ? "❌ YES" : "✅ NO"}`);

console.log("\n--- TEST COMPLETE ---");
