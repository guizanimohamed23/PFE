const scanNormalizationService = require('../src/services/scanNormalizationService');

const MEGA_TOXIC_PAYLOAD = {
  target: "http://mega-vuln.test",
  tools_executed: [
    {
      tool: "nuclei",
      stdout: "[aws-metadata-ssrf] [critical] http://mega-vuln.test/proxy?url=http://169.254.169.254\n[jwt-none-algo] [high] Found base64 JWT with alg:none",
      vulnerabilities_found: 2
    },
    {
      tool: "dirsearch",
      stdout: ":: [200] http://mega-vuln.test/.env\n:: [403] http://mega-vuln.test/admin",
      vulnerabilities_found: 1
    },
    {
      tool: "sqlmap",
      stdout: "[INFO] Testing 'OR 1=1' in login\n[!] Gid=0(root) uid=0(root)\n[+] Success: Database is MySQL",
      vulnerabilities_found: 1
    },
    {
      tool: "nmap-passive",
      stdout: "X-Powered-By: Django/3.2.1\nAWS_SECRET_KEY=AKIAJKFDLASKJFDLASKJF\nSet-Cookie: csrftoken=abc123xyz...",
      vulnerabilities_found: 1
    },
    {
      tool: "noise-engine",
      stdout: ":: Progress: [99%] :: Speed: 100/s :: Errors: 10\nConnection timed out for chunk 42",
      stderr: "Traceback: line 10, in scanner.py",
      vulnerabilities_found: 0
    }
  ]
};

console.log("--- Running MEGA-COVERAGE Benchmark ---\n");
const results = scanNormalizationService.normalizeHexstrikeResultsDetailed(MEGA_TOXIC_PAYLOAD);

console.log(`Scan Summary:`);
console.log(`- Findings Captured: ${results.findings.length}`);
console.log(`- Noise Filtered:   ${results.stats.droppedFindings}`);

console.log("\n--- Detailed Findings List ---");
results.findings.forEach((f, i) => {
  console.log(`${i+1}. [${f.severity.toUpperCase()}] ${f.title}`);
  console.log(`   Evidence: ${f.evidence.substring(0, 60)}...`);
});

const categories = {
  SSRF: results.findings.some(f => f.title.toLowerCase().includes("ssrf") || f.title.toLowerCase().includes("server-side request forgery")),
  JWT: results.findings.some(f => f.title.toLowerCase().includes("jwt")),
  Secrets: results.findings.some(f => f.title.toLowerCase().includes("aws") || f.title.toLowerCase().includes("secret")),
  SQLi: results.findings.some(f => f.title.toLowerCase().includes("sql") || f.evidence.toLowerCase().includes("root")),
  Env: results.findings.some(f => f.title.toLowerCase().includes(".env") || f.title.toLowerCase().includes("environment")),
  Framework: results.findings.some(f => f.title.toLowerCase().includes("django") || f.title.toLowerCase().includes("technology")),
};

console.log("\n--- Coverage Scorecard ---");
Object.entries(categories).forEach(([cat, found]) => {
  console.log(`${cat.padEnd(10)}: ${found ? "✅ CAPTURED" : "❌ MISSED"}`);
});
console.log("\n--- Noise Shield Check ---");
const noiseCheck = results.findings.some(f => f.evidence.toLowerCase().includes("traceback") || f.evidence.toLowerCase().includes("progress"));
console.log(`Noise Leaked? : ${noiseCheck ? "❌ YES" : "✅ NO (Shield Active)"}`);
