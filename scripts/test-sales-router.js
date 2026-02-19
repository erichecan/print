const salesRouter = require('../backend/src/vapi/tools/salesRouter');

async function testRouter() {
    console.log('🧪 Testing Sales Router...\n');

    const testCases = [
        {
            input: "How much is a hoodie?",
            expectedIntent: "QUOTE"
        },
        {
            input: "Where is my order OFF-123?",
            expectedIntent: "CHECK_ORDER"
        },
        {
            input: "I want to buy 50 t-shirts",
            expectedIntent: "CREATE_ORDER"
        },
        {
            input: "Do you have long sleeve shirts?",
            expectedIntent: "RECOMMEND_PRODUCT"
        },
        {
            input: "Hello there",
            expectedIntent: "UNKNOWN"
        }
    ];

    for (const test of testCases) {
        console.log(`Input: "${test.input}"`);
        const result = await salesRouter.routeRequest(test.input);
        console.log(`Result: ${result.intent} -> Tool: ${result.recommendedTool}`);

        if (result.intent === test.expectedIntent) {
            console.log('✅ PASS\n');
        } else {
            console.log(`❌ FAIL (Expected ${test.expectedIntent})\n`);
        }
    }
}

testRouter();
