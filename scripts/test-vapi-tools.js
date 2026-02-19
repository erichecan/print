const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}/api/vapi`;

async function testVapiTools() {
    console.log('🧪 Testing Vapi Tools...');
    console.log(`📡 Endpoint: ${BASE_URL}`);

    let newOrderCode = null;
    let priceRes = { data: { total: 100 } };

    // --- 3. Test Create Order ---
    console.log('\n--- 3. Testing create_order ---');
    try {
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
        newOrderCode = orderRes.data.orderCode;

        if (newOrderCode) {
            console.log(`\n--- 4. Testing check_order_status (${newOrderCode}) ---`);
            const statusRes = await axios.post(`${BASE_URL}/tools/order/status`, {
                orderCode: newOrderCode
            });
            console.log('✅ Response:', JSON.stringify(statusRes.data, null, 2));
        }
    } catch (error) {
        console.error('❌ Create Order Failed:', error.response ? error.response.data : error.message);
    }

    // --- 4.1 Test List Orders ---
    console.log(`\n--- 4.1 Testing list_orders (Search for "Vapi") ---`);
    try {
        const listRes = await axios.post(`${BASE_URL}/tools/order/list`, {
            customerName: 'Vapi'
        });
        console.log('✅ Response:', JSON.stringify(listRes.data, null, 2));
    } catch (error) {
        console.log('❌ List Orders Failed:', error.response ? error.response.data : error.message);
    }

    // --- 4.2 Test Update Order ---
    console.log(`\n--- 4.2 Testing update_order (Fake Code) ---`);
    try {
        const updateRes = await axios.post(`${BASE_URL}/tools/order/update`, {
            orderCode: newOrderCode || 'OFF-FAKE-123',
            notes: 'Customer called to confirm delivery date.'
        });
        console.log('✅ Response:', JSON.stringify(updateRes.data, null, 2));
    } catch (error) {
        console.log('❌ Update Order Failed:', error.response ? error.response.data : error.message);
    }

    // --- 4.5 Test Quote & Policy (New) ---
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

    // --- 5. Test Payment Link ---
    console.log(`\n--- 5. Testing send_payment_link (${newOrderCode}) ---`);
    try {
        const payRes = await axios.post(`${BASE_URL}/tools/payment/link`, {
            orderCode: newOrderCode || 'TEST-ORDER',
            amount: priceRes.data.total,
            method: 'sms',
            destination: '1234567890'
        });
        console.log('✅ Response:', JSON.stringify(payRes.data, null, 2));
    } catch (error) {
        console.log('❌ Payment Link Failed:', error.response ? error.response.data : error.message);
    }
}

// Wait for server to potentially start if running in parallel, but here we assume server is running
// or we run this script manually.
testVapiTools();
