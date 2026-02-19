const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}/api/vapi`;

async function testVapiTools() {
    console.log('🧪 Testing Vapi Tools...');
    console.log(`📡 Endpoint: ${BASE_URL}`);

    try {
        // 4.5 Test Quote & Policy (New)
        console.log('\n--- 4.5 Testing quote_and_policy ---');
        try {
            const quoteRes = await axios.post(`${BASE_URL}/tools/quote_and_policy`, {
                items: [
                    { productId: 'hoodie-1', quantity: 10, size: 'L' }
                ],
                printDetails: [{ location: 'Front' }],
                isRush: false
            });
            console.log('✅ Response:', JSON.stringify(quoteRes.data, null, 2));
        } catch (e) {
            console.log('❌ Quote Test Failed:', e.response?.data || e.message);
        }

        /*
                // 5. Test Payment Link
                console.log(`\n--- 5. Testing send_payment_link (${newOrderCode}) ---`);
                const payRes = await axios.post(`${BASE_URL}/tools/payment/link`, {
                    orderCode: newOrderCode || 'TEST-ORDER',
                    amount: priceRes.data.total,
                    method: 'sms',
                    destination: '1234567890'
                });
                console.log('✅ Response:', JSON.stringify(payRes.data, null, 2));
        */

    } catch (error) {
        console.error('❌ Test failed:', error.response ? error.response.data : error.message);
    }
}

// Wait for server to potentially start if running in parallel, but here we assume server is running
// or we run this script manually.
testVapiTools();
