const http = require('http');

const MOCK_SCAN_RESULTS = {
  target: "http://testphp.vulnweb.com",
  scannerState: "completed",
  scan_results: {
    execution_summary: {
      total_tools: 5,
      successful_tools: 5,
      failed_tools: 0,
      tools_used: ["sqlmap", "nuclei", "nikto", "dirsearch"]
    },
    tools_executed: [
      {
        tool: "sqlmap",
        status: "completed",
        stdout: "[INFO] GET parameter 'cat' IS vulnerable!\ntype: error-based\ntitle: MySQL >= 5.0.12 AND error-based\n[!] Gid=0(root) uid=0(root)",
        vulnerabilities_found: 1
      },
      {
        tool: "nuclei",
        status: "completed",
        stdout: "[xss-detection] [medium] http://testphp.vulnweb.com/search.php?test=query\nEvidence: <script>alert(1)</script>",
        vulnerabilities_found: 1
      },
      {
        tool: "nikto",
        status: "completed",
        stdout: "+ Server: Apache/2.4.7 (Ubuntu)\n+ /info.php: Associated with phpinfo() leaking configuration.",
        vulnerabilities_found: 1
      },
      {
        tool: "dirsearch",
        status: "completed",
        stdout: ":: [200] http://testphp.vulnweb.com/.git/config\n:: [200] http://testphp.vulnweb.com/CVS/Entries",
        vulnerabilities_found: 2
      }
    ]
  },
  metadata: {
    toolsInspected: 5,
    successfulTools: 5,
    failedTools: 0
  }
};

const server = http.createServer((req, res) => {
  console.log(`[Mock Engine] Received ${req.method} ${req.url}`);
  
  if (req.method === 'POST' && req.url === '/api/intelligence/smart-scan') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      console.log(`[Mock Engine] Scanning target: ${JSON.parse(body).target}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(MOCK_SCAN_RESULTS));
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: "Mock HexStrike Online" }));
  }
});

server.listen(8888, '127.0.0.1', () => {
  console.log('Mock HexStrike Engine running on http://127.0.0.1:8888');
  console.log('You can now run a scan from the UI or via scripts.');
});
