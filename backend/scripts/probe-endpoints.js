/**
 * Automated Endpoint Probe
 * Reads routes.json and probes each endpoint to check for 500 errors.
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const ROUTES_FILE = path.join(__dirname, '../routes.json');

async function probe() {
    if (!fs.existsSync(ROUTES_FILE)) {
        console.error('❌ routes.json not found. Run generate-routes.js first.');
        process.exit(1);
    }

    const routes = JSON.parse(fs.readFileSync(ROUTES_FILE));
    console.log(`🔍 Probing ${routes.length} endpoints at ${BASE_URL}...`);

    const results = {
        total: 0,
        success: 0, // 2xx, 3xx, 4xx (expected errors)
        failures: 0, // 5xx (unexpected)
        errors: [],
    };

    for (const route of routes) {
        // Skip parameterized routes for now (too hard to guess IDs without seed data mapping)
        // Or try to probe them with dummy IDs just to see if they crash nicely (404/400) or 500.
        // Let's retry with '123' or 'dummy-id' for params.
        let probeUrl = route.path.replace(/:[a-zA-Z0-9_]+/g, 'dummy-id');

        // Skip some destructive methods or specific paths if needed
        if (route.method === 'DELETE') continue;

        // Skip auth routes that might be tricky or side-effect heavy? 
        // Actually, we WANT to probe them to ensure they return 401/403, not 500.

        const traceId = `probe-${Date.now()}`;

        try {
            results.total++;
            const startTime = Date.now();

            const config = {
                method: route.method,
                url: `${BASE_URL}${probeUrl}`,
                headers: {
                    'X-Request-Id': traceId,
                    'Content-Type': 'application/json',
                },
                validateStatus: () => true, // Don't throw on status codes
                timeout: 2000, // 2s timeout
            };

            // Add dummy body for POST/PUT
            if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
                config.data = {};
            }

            const response = await axios(config);
            const duration = Date.now() - startTime;
            const status = response.status;

            if (status >= 500) {
                console.error(`❌ [${status}] ${route.method} ${probeUrl} (${duration}ms)`);
                results.failures++;
                results.errors.push({
                    method: route.method,
                    path: probeUrl,
                    status,
                    traceId,
                    data: response.data
                });
            } else {
                // console.log(`✅ [${status}] ${route.method} ${probeUrl} (${duration}ms)`);
                results.success++;
                process.stdout.write('.'); // Compact progress
            }

        } catch (error) {
            console.error(`\n💥 Network Error probing ${route.method} ${probeUrl}: ${error.message}`);
            // Connection refused, etc.
            // If the server crashed, we should abort.
            if (error.code === 'ECONNREFUSED') {
                console.error('CRITICAL: Server appears to be down.');
                process.exit(1);
            }
        }

        // Rate limit ourselves slightly to not overwhelm the server
        await new Promise(r => setTimeout(r, 50));
    }

    console.log('\n\n📊 Probe Results:');
    console.log(`Total: ${results.total}`);
    console.log(`Success (2xx-4xx): ${results.success}`);
    console.log(`Failures (5xx): ${results.failures}`);

    if (results.failures > 0) {
        console.log('\n🚨 Internal Server Errors Found:');
        results.errors.forEach(e => {
            console.log(`- ${e.method} ${e.path} -> ${e.status} (Trace: ${e.traceId})`);
        });

        // Save report
        fs.writeFileSync(path.join(__dirname, '../probe-report.json'), JSON.stringify(results, null, 2));
        process.exit(1); // Fail for CI
    } else {
        console.log('\n✨ No 500 errors detected on probed routes.');
        process.exit(0);
    }
}

probe();
