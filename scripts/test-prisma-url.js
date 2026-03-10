const { PrismaClient } = require('@prisma/client');

async function test() {
    const badUrl = 'postgresql://app:pass@/suvernireplus?host=/cloudsql/print-482914:us-central1:print1600';
    const goodUrl = 'postgresql://app:pass@localhost/suvernireplus?host=/cloudsql/print-482914:us-central1:print1600';

    console.log("Testing Node URL parser on badUrl:");
    try {
        const u1 = new URL(badUrl);
        console.log(u1.hostname);
    } catch (e) {
        console.error("Node URL error:", e.message);
    }

    console.log("\nTesting Node URL parser on goodUrl:");
    try {
        const u2 = new URL(goodUrl);
        console.log(u2.hostname);
    } catch (e) {
        console.error("Node URL error:", e.message);
    }
}

test();
