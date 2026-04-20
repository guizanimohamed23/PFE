const prisma = require('./src/config/db');

async function query() {
    try {
        const scan = await prisma.scan.findFirst({
            where: { targetUrl: 'https://demo.owasp-juice.shop/' },
            orderBy: { id: 'desc' },
            include: {
                results: {
                    include: {
                        vulnerability: true
                    }
                }
            }
        });
        
        if (!scan) {
            console.log("No scan found for Juice Shop.");
            return;
        }

        console.log("=".repeat(60));
        console.log(`SCAN SUMMARY: ${scan.targetUrl}`);
        console.log(`Scan State: ${scan.scanState}`);
        console.log(`Vulnerabilities Found: ${scan.results.length}`);
        console.log("=".repeat(60));

        scan.results.forEach((r, i) => {
            console.log(`${i + 1}. [${r.vulnerability.severity.toUpperCase()}] ${r.vulnerability.title}`);
            console.log(`   Description: ${r.vulnerability.description.substring(0, 100)}...`);
            console.log("-".repeat(30));
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

query();
