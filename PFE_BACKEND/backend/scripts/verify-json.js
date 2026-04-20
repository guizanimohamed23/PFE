const scanNormalizationService = require('../src/services/scanNormalizationService');
const fs = require('fs');

const PAYLOAD = {
  target: "http://testphp.vulnweb.com",
  tools_executed: [
    {
      tool: "sqlmap",
      stdout: "[INFO] GET parameter 'cat' IS vulnerable!\n[!] Gid=0(root) uid=0(root)",
      vulnerabilities_found: 1
    },
    {
      tool: "nuclei",
      stdout: "[xss-detection] [medium] http://testphp.vulnweb.com/search.php?test=query\nEvidence: <script>alert(1)</script>",
      vulnerabilities_found: 1
    },
    {
      tool: "nikto",
      stdout: "+ /info.php: Associated with phpinfo() leaking configuration.",
      vulnerabilities_found: 1
    },
    {
      tool: "dirsearch",
      stdout: ":: [200] http://testphp.vulnweb.com/.git/config\n:: [200] http://testphp.vulnweb.com/CVS/Entries",
      vulnerabilities_found: 2
    }
  ]
};

const results = scanNormalizationService.normalizeHexstrikeResultsDetailed(PAYLOAD);
fs.writeFileSync('benchmark_final.json', JSON.stringify(results, null, 2));

console.log("Benchmark results saved to benchmark_final.json");
console.log("Findings count:", results.findings.length);
