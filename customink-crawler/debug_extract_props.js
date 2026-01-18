const puppeteer = require('puppeteer');
const fs = require('fs');

async function extract(url) {
    console.log(`Trying URL: ${url}`);
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Log XHR/Fetch requests
    await page.setRequestInterception(true);
    page.on('request', request => {
        request.continue();
    });
    page.on('response', async response => {
        const url = response.url();
        const type = response.request().resourceType();
        if ((type === 'xhr' || type === 'fetch') && url.includes('customink')) {
            try {
                // If response is JSON, check for 'sleeve' or 'images'
                const text = await response.text();
                if (text.includes('sleeve') || text.includes('views')) {
                    console.log(`\n🎯 Found Interesting Response: ${url}`);
                    // Save it
                    const filename = `response_${url.split('/').pop().replace('?', '_')}.json`;
                    fs.writeFileSync(filename, text.substring(0, 10000)); // Save snippet
                    console.log(`   Saved snippet to ${filename}`);
                }
            } catch (e) { }
        }
    });

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // Check for 404
        const title = await page.title();
        console.log(`Page Title: ${title}`);
        if (title.includes('404') || title.includes('Page Not Found')) {
            console.log("❌ 404 Detected.");
            await browser.close();
            return false;
        }

        const data = await page.evaluate(() => {
            const dataDiv = document.getElementById('product-details-page');
            if (dataDiv) return dataDiv.getAttribute('data-product-props');
            return null;
        });

        if (data) {
            console.log("✅ Data extracted!");

            // Save Full HTML
            const html = await page.content();
            fs.writeFileSync('product_page.html', html);
            console.log("Saved HTML to product_page.html");

            // Check for image pattern in HTML
            if (html.includes('right_sleeve')) {
                console.log("🔥 FOUND 'right_sleeve' in HTML!");
            } else {
                console.log("❄️ 'right_sleeve' NOT found in HTML.");
            }

            fs.writeFileSync('product_debug_full.json', data);

            // Format for readability
            try {
                const json = JSON.parse(data);
                fs.writeFileSync('product_debug_pretty.json', JSON.stringify(json, null, 2));
                console.log("Saved pretty JSON to product_debug_pretty.json");
            } catch (e) { }

            await browser.close();
            return true;
        } else {
            console.log("⚠️ No data-product-props found.");
        }
    } catch (e) {
        console.error(`Error: ${e.message}`);
    }

    await browser.close();
    return false;
}

async function main() {
    // Try variations based on user data
    // SKU: CINK-647800 -> Style ID 647800?
    // ColorID: 176130

    const possibleUrls = [
        'https://www.customink.com/products/styles/port-and-company-womens-fan-favorite-v-neck-t-shirt/647800',
        'https://www.customink.com/products/styles/port-and-company-womens-fan-favorite-v-neck-t-shirt/176130',
        'https://www.customink.com/products/styles/port-and-company-womens-fan-favorite-v-neck-t-shirt'
    ];

    for (const url of possibleUrls) {
        const success = await extract(url);
        if (success) break;
    }
}

main();
