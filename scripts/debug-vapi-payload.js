const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}/api/vapi`;

async function debugVapiPayload() {
    console.log('🐞 Debugging Vapi Payloads...');
    console.log(`📡 Endpoint: ${BASE_URL}`);

    // Case 1: Standard Flat Payload (What we expect)
    console.log('\n--- 1. Testing Flat Payload (Standard) ---');
    try {
        const res = await axios.post(`${BASE_URL}/tools/product/recommend`, {
            query: 'hoodie'
        });
        console.log('✅ Success:', res.data.length > 0 ? 'Returned products' : 'Empty list');
    } catch (e) {
        console.log('❌ Failed:', e.response?.data || e.message);
    }

    // Case 2: Vapi "Server URL" Wrapped Payload (Common in Vapi Webhooks)
    console.log('\n--- 2. Testing Wrapped Payload (Vapi Message) ---');
    try {
        const res = await axios.post(`${BASE_URL}/tools/product/recommend`, {
            message: {
                toolCalls: [
                    {
                        function: {
                            name: 'recommendProduct',
                            arguments: JSON.stringify({ query: 't-shirt' })
                        }
                    }
                ]
            }
        });
        console.log('✅ Success:', res.data.length > 0 ? 'Returned products' : 'Empty list');
    } catch (e) {
        console.log('❌ Failed:', e.response?.data || e.message);
    }
}

debugVapiPayload();
