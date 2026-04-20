const axios = require('axios');

async function testLiveScan() {
  console.log("--- Initiating Full-Cycle Scan Test ---");
  console.log("Target: http://demo.testfire.net");
  
  try {
    // We assume the backend is NOT necessarily running, 
    // so we will call the services directly for this 'live' test 
    // to ensure the user sees the output even if their server is down.
    
    const scanService = require('../src/services/scanService');
    
    console.log("Calling scanService.create()...");
    const result = await scanService.create({ 
      targetUrl: "http://demo.testfire.net",
      scanProfile: { mode: "quick" } 
    }, null);
    
    console.log("\n✅ Scan Complete!");
    console.log("Scan Key:", result.targetUrl);
    console.log("Status:  ", result.scanState);
    
    console.log("\n--- Normalized Results Summary ---");
    console.log(`Matched Findings:   ${result.scanMeta.matchedFindings}`);
    console.log(`Tools Inspected:    ${result.scanMeta.scanner.toolsInspected}`);
    console.log(`Vulnerabilities Found:`);
    
    if (result.results && result.results.length > 0) {
      result.results.forEach((r, i) => {
        console.log(`${i+1}. [${r.vulnerability.severity.toUpperCase()}] ${r.vulnerability.title}`);
        console.log(`   Proof: ${r.evidence.substring(0, 100)}...`);
      });
    } else {
      console.log("No findings matched in database.");
    }
  } catch (error) {
    console.error("\n❌ Test Failed:", error.message);
    if (error.details) console.error("Details:", error.details);
  }
}

testLiveScan();
