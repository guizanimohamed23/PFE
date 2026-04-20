const scanNormalizationService = require('../src/services/scanNormalizationService');

const NEW_TARGET_PAYLOAD = {
  target: "http://sec-test.internal",
  tools_executed: [
    {
      tool: "sqlmap",
      stdout: "[!] Gid=0(root) uid=0(root)\n[+] Success: Database is PostgreSQL\n[INFO] Testing 'OR 1=1' in login",
      vulnerabilities_found: 1
    },
    {
      tool: "nuclei",
      stdout: "[rce-detection] [medium] http://sec-test.internal/exec?cmd=id\nEvidence: uid=0(root) gid=0(root) groups=0(root)",
      vulnerabilities_found: 1
    },
    {
      tool: "secret-scanner",
      stdout: "Found potential AWS key in /config/aws.conf\nAKIAJS72XKF... [REDACTED]",
      vulnerabilities_found: 1
    },
    {
      tool: "nmap",
      stdout: "Scanning 10.0.0.5...\nPort 22: Open\nPort 80: Open (Banner: Apache/2.4.41)",
      vulnerabilities_found: 0
    }
  ]
};

console.log("--- Running REFINED LOGIC Benchmark (New Target) ---\n");
const results = scanNormalizationService.normalizeHexstrikeResultsDetailed(NEW_TARGET_PAYLOAD);

console.log(`Scan Summary:`);
console.log(`- Findings Captured: ${results.findings.length}`);
console.log(`- Noise Filtered:   ${results.stats.droppedFindings}`);

console.log("\n--- Detailed Findings List ---");
results.findings.forEach((f, i) => {
  const sig = `${f.tool || "generic"}|${f.cveId || "none"}|${f.title}`.toLowerCase();
  console.log(`\nFINDING #${i+1}`);
  console.log(`- Title:    [${f.severity.toUpperCase()}] ${f.title}`);
  console.log(`- Tool:     ${f.tool}`);
  console.log(`- Signature: ${sig}`);
  console.log(`- Evidence Preview: ${f.evidence.substring(0, 80).replace(/\n/g, ' ')}...`);
});

const evaluations = {
  SeverityPromotion_SQLi: results.findings.some(f => f.title.includes("SQL") && f.severity === "critical"),
  SeverityPromotion_RCE: results.findings.some(f => f.title.includes("Nuclei") && f.severity === "critical"), // Fixed check for nuclei-rce
  IntelligentTitling: results.findings.every(f => !(f.title || "").startsWith("sqlmap:") && !(f.title || "").startsWith("secret-scanner:")),
  AWS_Marker_Detection: results.findings.some(f => f.evidence.includes("AKIA") && f.severity === "critical"),
};

console.log("\n--- Logic Verification Scorecard ---");
Object.entries(evaluations).forEach(([test, pass]) => {
  console.log(`${test.padEnd(25)}: ${pass ? "✅ PASSED" : "❌ FAILED"}`);
});

const falsePositives = results.findings.some(f => f.title.toLowerCase().includes("nmap") || f.title.toLowerCase().includes("port"));
console.log(`False Positives Found? : ${falsePositives ? "❌ YES" : "✅ NO"}`);
