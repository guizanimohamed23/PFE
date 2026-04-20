const scanService = require('./src/services/scanService');
const prisma = require('./src/config/db');

async function verify() {
    const target = 'https://demo.owasp-juice.shop/';
    console.log(`🚀 Starting verification scan for ${target}`);
    
    try {
        await prisma.$connect();
        
        // Trigger scan directly via service to bypass Auth for testing
        const scan = await scanService.create({
            targetUrl: target,
            scanProfile: 'balanced',
            maxTools: 12
        }, null);
        
        const scanId = scan.id;
        console.log(`✅ Scan triggered (ID: ${scanId}). Waiting for completion...`);
        
        let attempts = 0;
        while (attempts < 60) {
            const currentScan = await prisma.scan.findUnique({
                where: { id: scanId },
                include: { results: { include: { vulnerability: true } } }
            });
            
            if (currentScan.scanState === 'completed') {
                console.log(`\n🏁 Scan Completed! Findings: ${currentScan.results.length}`);
                currentScan.results.forEach((r, i) => {
                   console.log(`${i+1}. [${r.vulnerability?.severity || '??'}] ${r.vulnerability?.title || '??'}`);
                });
                break;
            } else if (currentScan.scanState === 'failed') {
                console.log(`\n❌ Scan Failed.`);
                break;
            }
            
            process.stdout.write(`\rState: ${currentScan.scanState} | Findings: ${currentScan.results.length} ... `);
            await new Promise(r => setTimeout(r, 10000));
            attempts++;
        }
    } catch (e) {
        console.error('\n❌ Verification failed:', e.stack);
    } finally {
        await prisma.$disconnect();
    }
}

verify();
