const scanNormalizationService = require('../src/services/scanNormalizationService');

const MOCK_NOISY_RESULTS = {
  target: "http://demo.testfire.net",
  tools_executed: [
    {
      tool: "sqlmap",
      status: "completed",
      stdout: "Testing URL: http://demo.testfire.net/login.aspx\n[+] Potential SQL Injection found!\nPayload: ' OR 1=1--",
      vulnerabilities_found: 1
    },
    {
      tool: "nuclei",
      status: "completed",
      stdout: "[xss-reflected] [low] http://demo.testfire.net/search.aspx?q=<script>alert(1)</script>",
      vulnerabilities_found: 1
    },
    {
      tool: "arjun",
      status: "failed",
      stderr: "Encountered an error: Connection aborted.",
      vulnerabilities_found: 0
    },
    {
      tool: "banner-grab",
      status: "completed",
      stdout: "Server: Apache-Coyote/1.1\nX-Powered-By: ASP.NET",
      vulnerabilities_found: 0
    }
  ],
  metadata: {
    toolsInspected: 4
  }
};

console.log("--- Running Normalization Benchmark ---\n");
const detailed = scanNormalizationService.normalizeHexstrikeResultsDetailed(MOCK_NOISY_RESULTS);

console.log("Target:", detailed.findings[0]?.title ? "http://demo.testfire.net" : "None");
console.log("Total Findings (Before Filter):", detailed.stats.rawTotalFindings);
console.log("Total Findings (After Filter): ", detailed.stats.filteredFindings);
console.log("Dropped Noise Count:           ", detailed.stats.droppedFindings);

console.log("\n--- Findings Captured ---");
detailed.findings.forEach((f, i) => {
  console.log(`${i+1}. [${f.severity.toUpperCase()}] ${f.title}`);
});

console.log("\n--- Logic Validation ---");
const arjunFinding = detailed.findings.find(f => f.title.toLowerCase().includes("arjun"));
console.log("Arjun Error Filtered?", arjunFinding ? "❌ NO" : "✅ YES");

const sqlFinding = detailed.findings.find(f => f.title.toLowerCase().includes("sql"));
console.log("SQLi Captured?", sqlFinding ? "✅ YES" : "❌ NO");
