const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const networkData = [];

    // Listen for responses
    page.on('response', async response => {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';

        if (contentType.includes('application/json') || url.includes('.json')) {
            try {
                // Avoid huge files or irrelevant ones if possible, but for data discovery we want most things
                if (url.includes('google') || url.includes('clarity') || url.includes('doubleclick')) return;

                const json = await response.json();
                networkData.push({
                    url: url,
                    data: json
                });
            } catch (e) {
                // ignore failed json parse (e.g. for preflight or binary)
            }
        }
    });

    const PRODUCT_URL = 'https://www.customink.com/products/t-shirts/short-sleeve-t-shirts/gildan-softstyle-jersey-t-shirt/176100';
    console.log(`Navigating to: ${PRODUCT_URL}`);

    try {
        await page.goto(PRODUCT_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch (e) {
        console.log('Navigation timeout or error, proceeding to save captured data...');
    }

    // Give it a bit more time for lazy loaded stuff
    await new Promise(r => setTimeout(r, 5000));

    console.log(`Captured ${networkData.length} JSON responses.`);

    // Filter for interesting stuff to save specific file
    const interestingData = networkData.filter(d => {
        const str = JSON.stringify(d.data);
        return str.includes('variants') || str.includes('sku') || str.includes('styles') || str.includes('176100'); // 176100 is the product ID
    });

    fs.writeFileSync('network_debug.json', JSON.stringify(networkData, null, 2)); // Save all for manual grep if needed
    fs.writeFileSync('network_interesting.json', JSON.stringify(interestingData, null, 2));

    console.log('Saved network_debug.json and network_interesting.json');

    await browser.close();
})();
