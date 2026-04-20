const fs = require('fs');
const res = JSON.parse(fs.readFileSync('benchmark_final.json'));
const sqli = res.findings.find(f => f.tool === 'sqlmap' && f.title.includes("SQL Injection"));
const xss = res.findings.find(f => f.tool === 'nuclei' && f.title.includes("Cross-Site Scripting"));
const sensitiveFiles = res.findings.filter(f => f.tool === 'dirsearch' || f.tool === 'nikto');

let allOk = true;

if (sqli && sqli.severity === "critical" && sqli.evidence.includes("uid=0(root)")) {
    console.log("SQLI (ROOT PROMOTION): OK");
} else {
    console.log("SQLI (ROOT PROMOTION): FAIL", JSON.stringify(sqli));
    allOk = false;
}

if (xss && xss.title.includes("(via Nuclei)")) {
    console.log("XSS (SEMANTIC TITLING): OK");
} else {
    console.log("XSS (SEMANTIC TITLING): FAIL", JSON.stringify(xss));
    allOk = false;
}

if (sensitiveFiles.length >= 2) {
    console.log("SENSITIVE FILES: OK (Found " + sensitiveFiles.length + ")");
} else {
    console.log("SENSITIVE FILES: FAIL", JSON.stringify(sensitiveFiles));
    allOk = false;
}

if (allOk) console.log("\n>>> PERFECTION ACHIEVED! <<<");
else console.log("\n>>> GAPS REMAINING. <<<");
