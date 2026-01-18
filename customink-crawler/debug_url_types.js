const axios = require('axios');

const urls = [
    // User provided valid URL (to verify connectivity/pattern)
    'https://mms-images.out.customink.com/mms/images/catalog/colors/176130/views/alt/front_large.png',
    'https://mms-images.out.customink.com/mms/images/catalog/colors/176130/views/alt/right_sleeve_medium_extended.png',

    // Scraped IDs (from my 647800 crawl)
    'https://mms-images.out.customink.com/mms/images/catalog/colors/647800/views/alt/front_large.png',
    'https://mms-images.out.customink.com/mms/images/catalog/colors/647801/views/alt/front_large.png',

    // Variations
    'https://mms-images.out.customink.com/mms/images/catalog/colors/647800/front_large.png',
    'https://mms-images.out.customink.com/mms/images/catalog/styles/647800/colors/647800/views/alt/front_large.png'
];

async function check() {
    for (const u of urls) {
        try {
            const res = await axios.head(u, { timeout: 5000 });
            console.log(`[${res.status}] ${u}`);
        } catch (e) {
            console.log(`[FAILED] ${u} (${e.message} ${e.response?.status})`);
        }
    }
}
check();
