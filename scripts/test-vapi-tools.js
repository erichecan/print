const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}/api/vapi`;

async function testVapiTools() {
    console.log('🧪 Testing Vapi Tools...');
    console.log(`📡 Endpoint: ${BASE_URL}`);

    try {
        // 1. Test Product Recommendation
        console.log('\n--- 1. Testing recommend_product ("hoodie") ---');
        const recRes = await axios.post(`${BASE_URL}/tools/product/recommend`, {
            query: 'hoodie'
        });
        console.log('✅ Response:', JSON.stringify(recRes.data, null, 2));

        // 2. Test Pricing Calculation
        console.log('\n--- 2. Testing calculate_price ---');
        const priceRes = await axios.post(`${BASE_URL}/tools/pricing/calculate`, {
            items: [
                { productId: 'mock-id', quantity: 10, size: 'L' }, // Size fee applies?
                { productId: 'mock-id', quantity: 5, size: '2XL' } // Size fee applies ($2)
            ],
            printDetails: [
                { location: 'Front' }, // $5
                { location: 'Back' }   // $5
            ],
            isRush: true // $25
        });
        console.log('✅ Response:', JSON.stringify(priceRes.data, null, 2));

        // 3. Test Order Creation
        console.log('\n--- 3. Testing create_order ---');
        const orderRes = await axios.post(`${BASE_URL}/tools/order/create`, {
            customer: {
                name: 'Vapi Test User',
                phone: '1234567890',
                email: 'vapi@test.com'
            },
            items: [
                { name: 'Gildan Hoodie', quantity: 1, size: 'L', color: 'Black' }
            ],
            printDetails: [{ location: 'Front' }],
            pricing: priceRes.data,
            shipping: { method: 'pickup' }
        });
        console.log('✅ Response:', JSON.stringify(orderRes.data, null, 2));
        const newOrderCode = orderRes.data.orderCode;

        // 4. Test Check Order Status
        if (newOrderCode) {
            console.log(`\n--- 4. Testing check_order_status (${newOrderCode}) ---`);
            const statusRes = await axios.post(`${BASE_URL}/tools/order/status`, {
                orderCode: newOrderCode
            });
            console.log('✅ Response:', JSON.stringify(statusRes.data, null, 2));
        }

        // 5. Test Payment Link
        console.log(`\n--- 5. Testing send_payment_link (${newOrderCode}) ---`);
        const payRes = await axios.post(`${BASE_URL}/tools/payment/link`, {
            orderCode: newOrderCode || 'TEST-ORDER',
            amount: priceRes.data.total,
            method: 'sms',
            destination: '1234567890'
        });
        console.log('✅ Response:', JSON.stringify(payRes.data, null, 2));

    } catch (error) {
        console.error('❌ Test failed:', error.response ? error.response.data : error.message);
    }
}

// Wait for server to potentially start if running in parallel, but here we assume server is running
// or we run this script manually.
testVapiTools();
