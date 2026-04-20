const scanNormalizationService = require('../src/services/scanNormalizationService');

const TOXIC_PAYLOAD = {
  target: "http://threat-model.local",
  tools_executed: [
    {
      tool: "nuclei",
      stdout: "[ssrf-detection] [critical] http://threat-model.local/proxy?url=http://169.254.169.254",
      vulnerabilities_found: 1
    },
    {
      tool: "sqlmap",
      stdout: "--- [Noise] Starting sqlmap v1.7 ---\n[INFO] testing connection\n[+] Parameter q is vulnerable!",
      vulnerabilities_found: 1
    },
    {
      tool: "ffuf",
      stdout: ":: Progress: [1000/1000] :: Job: 1 :: Errors: 0 ::",
      vulnerabilities_found: 0
    },
    {
      tool: "error-tool",
      stderr: "Traceback (most recent call last):\n  File \"scanner.py\", line 42, in <module>\nConnectionRefusedError",
      vulnerabilities_found: 0
    }
  ]
};

console.log("--- Running Toxic Payload Verification ---\n");
const results = scanNormalizationService.normalizeHexstrikeResultsDetailed(TOXIC_PAYLOAD);

console.log(`Scan Results: ${results.findings.length} findings captured.`);
console.log(`Noise Dropped: ${results.stats.droppedFindings} items filtered.`);

results.findings.forEach((f, i) => {
  console.log(`${i+1}. [${f.severity.toUpperCase()}] ${f.title}`);
});

const hasSSRF = results.findings.some(f => f.title.toLowerCase().includes("ssrf"));
const hasSQLI = results.findings.some(f => f.title.toLowerCase().includes("sql"));
const hasNoise = results.findings.some(f => f.title.toLowerCase().includes("progress") || f.title.toLowerCase().includes("traceback"));

console.log("\n--- Verification Results ---");
console.log("SSRF Correctly Captured?", hasSSRF ? "✅ YES" : "❌ NO");
console.log("SQLI Correctly Captured?", hasSQLI ? "✅ YES" : "❌ NO");
console.log("Noise Correctly Filtered?", !hasNoise ? "✅ YES" : "❌ NO");
