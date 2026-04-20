const { runHexStrikeScan } = require('./src/services/hexstrikeService');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function validate() {
    const target = 'http://testphp.vulnweb.com/';
    console.log(`[VALIDATION] Starting scan for ${target}...`);
    console.log(`[VALIDATION] Configuration: Objective=comprehensive, MaxTools=20`);

    try {
        const result = await runHexStrikeScan(target, { 
            objective: 'recon', 
            maxTools: 20,
            timeoutMs: 300000 // 5 minutes
        });

        const outputPath = path.join(__dirname, 'validation_result.json');
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

        console.log(`[VALIDATION] Scan completed with state: ${result.scannerState}`);
        console.log(`[VALIDATION] Results saved to: ${outputPath}`);
        console.log(`[VALIDATION] Tools Inspected: ${result.metadata.toolsInspected}`);
        console.log(`[VALIDATION] Successful Tools: ${result.metadata.successfulTools}`);
        console.log(`[VALIDATION] Failed Tools: ${result.metadata.failedTools}`);
        
        if (result.metadata.totalVulnerabilities > 0) {
            console.log(`[VALIDATION] Found ${result.metadata.totalVulnerabilities} vulnerabilities.`);
        } else {
            console.log(`[WARNING] No vulnerabilities found in comprehensive scan.`);
        }

    } catch (error) {
        console.error('[ERROR] Validation scan failed:', error);
        if (error.details) {
            console.error('[ERROR] Details:', JSON.stringify(error.details, null, 2));
        }
        process.exit(1);
    }
}

validate();
