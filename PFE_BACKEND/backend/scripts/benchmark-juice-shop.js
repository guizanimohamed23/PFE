const scanService = require('../src/services/scanService');

async function benchmarkJuiceShop() {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 STARTING HEXSTRIKE BENCHMARK: OWASP JUICE SHOP");
    console.log("Objective: Thorough (High-Fidelity Scan)");
    console.log("Target:    https://demo.owasp-juice.shop/");
    console.log("=".repeat(60) + "\n");

    const startTime = Date.now();

    try {
        console.log("[1/3] Triggering Thorough Scan...");
        const result = await scanService.create({
            targetUrl: "https://demo.owasp-juice.shop/",
            scanProfile: {
                objective: "thorough",
                maxTools: 20,
                timeoutMs: 3600000 // 1 hour timeout for deep scan
            }
        }, null);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✅ Scan Complete in ${duration}s!`);
        console.log(`Status:  ${result.scanState}`);
        console.log(`Outcome: ${result.scanMeta.scannerOutcome}`);

        console.log("\n" + "-".repeat(60));
        console.log("📊 PIPELINE DIAGNOSTICS");
        console.log("-".repeat(60));
        console.log(`Total Findings (Raw):    ${result.scanMeta.totalFindings}`);
        console.log(`Matched Findings:        ${result.scanMeta.matchedFindings}`);
        console.log(`New Vulns Created:       ${result.scanMeta.newVulnerabilitiesCreated}`);
        console.log(`Tools Inspected:         ${result.scanMeta.scanner.toolsInspected}`);
        console.log(`Tools Used:              ${result.scanMeta.scanner.toolsUsed.join(', ')}`);
        
        console.log("\n" + "-".repeat(60));
        console.log("🔍 VULNERABILITY SUMMARY");
        console.log("-".repeat(60));

        if (result.results && result.results.length > 0) {
            // Sort by severity
            const severityOrder = { "critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4 };
            const sortedResults = [...result.results].sort((a, b) => 
                (severityOrder[a.vulnerability.severity.toLowerCase()] ?? 99) - 
                (severityOrder[b.vulnerability.severity.toLowerCase()] ?? 99)
            );

            sortedResults.forEach((r, i) => {
                console.log(`${(i + 1).toString().padStart(2, ' ')}. [${r.vulnerability.severity.toUpperCase().padEnd(8)}] ${r.vulnerability.title}`);
            });
        } else {
            console.log("⚠️  No matched findings discovered.");
        }

        console.log("\n" + "=".repeat(60));
        console.log("🏁 BENCHMARK FINISHED");
        console.log("=".repeat(60) + "\n");

    } catch (error) {
        console.error("\n❌ Benchmark Failed!");
        console.error("Error:", error.message);
        if (error.details) console.error("Details:", error.details);
    }
}

benchmarkJuiceShop();
