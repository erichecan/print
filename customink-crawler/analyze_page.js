const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    // Launch
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // List Page
    const LIST_URL = 'https://www.customink.com/products/t-shirts/short-sleeve-t-shirts/16';
    console.log(`Navigating to list: ${LIST_URL}`);
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(LIST_URL, { waitUntil: 'networkidle2' });

    // Find Link
    const link = await page.evaluate(() => {
        // Strategy A
        const art = document.querySelector('article a');
        if (art && art.href) return art.href;
        // Strategy B
        const card = document.querySelector('.pc-ProductCard a');
        if (card && card.href) return card.href;
        // Search
        const links = Array.from(document.links);
        const prod = links.find(l => l.href.includes('/products/styles/') || (l.href.includes('/products/') && l.href.length > 60));
        return prod ? prod.href : null;
    });

    if (!link) {
        fs.writeFileSync('debug_list_fail.html', await page.content());
        throw new Error("No link found");
    }

    // Detail Page
    console.log(`Navigating: ${link}`);
    await page.goto(link, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 5000));

    // Dump
    fs.writeFileSync('product_detail_debug.html', await page.content());

    // JSON
    const data = await page.evaluate(() => {
        const dataDiv = document.getElementById('product-details-page');
        let props = null;
        if (dataDiv) {
            const attr = dataDiv.getAttribute('data-product-props');
            if (attr) {
                try {
                    props = JSON.parse(attr);
                } catch (e) { props = "Parse Error"; }
            }
        }

        // Find visible price
        let price = "Not Found";
        const priceEl = Array.from(document.querySelectorAll('*')).find(el =>
            el.children.length === 0 &&
            (el.innerText && (el.innerText.includes('$') || el.innerText.toLowerCase().includes('starting at'))) &&
            el.innerText.length < 50
        );

        if (priceEl) {
            price = { text: priceEl.innerText, class: priceEl.className, tag: priceEl.tagName };
        }

        // Also check if there is a meta tag for price
        const metaPrice = document.querySelector('meta[property="product:price:amount"]');
        const metaCurrency = document.querySelector('meta[property="product:price:currency"]');

        return {
            propsFound: !!props,
            priceFound: price,
            metaPrice: metaPrice ? metaPrice.content : null,
            metaCurrency: metaCurrency ? metaCurrency.content : null
        };
    });
    fs.writeFileSync('product_json_debug.json', JSON.stringify(data, null, 2));
    console.log('Saved debug files.');

    await browser.close();
})();
