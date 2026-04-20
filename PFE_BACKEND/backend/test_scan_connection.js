const scanService = require('./src/services/scanService');
const prisma = require('./src/config/db');

async function test() {
    console.log("Testing scan service connection...");
    try {
        await prisma.$connect();
        console.log("Database connected.");
        
        console.log("Triggering test scan for example.com...");
        const result = await scanService.create({
            targetUrl: "http://example.com",
            scanProfile: {
                objective: "quick",
                maxTools: 1,
                timeoutMs: 60000
            }
        }, null);
        
        console.log("Scan Result Success!");
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Test Failed!");
        console.error(error);
        if (error.response) {
            console.error("Response Data:", error.response.data);
        }
    } finally {
        await prisma.$disconnect();
    }
}

test();
