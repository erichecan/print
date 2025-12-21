
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const INPUT_FILE = path.join(__dirname, '../docs/customink-analysis/all-colors-with-names.json');
const OUTPUT_BASE_DIR = path.join(__dirname, '../customink-images/products');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_BASE_DIR)) {
    fs.mkdirSync(OUTPUT_BASE_DIR, { recursive: true });
}

function downloadImage(url, dest) {
    return new Promise((resolve, reject) => {
        if (!url) {
            return reject(new Error('No URL provided'));
        }

        // If file exists and size > 0, skip
        if (fs.existsSync(dest)) {
            const stats = fs.statSync(dest);
            if (stats.size > 0) {
                console.log(`  Skipping (exists): ${path.basename(dest)}`);
                return resolve('skipped');
            }
        }

        // Ensure directory exists
        const dir = path.dirname(dest);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const file = fs.createWriteStream(dest);
        const protocol = url.startsWith('https') ? https : http;

        protocol.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(() => {
                        console.log(`  Downloaded: ${path.basename(dest)}`);
                        resolve('downloaded');
                    });
                });
            } else if (response.statusCode === 301 || response.statusCode === 302) {
                // Handle Redirects
                const newUrl = response.headers.location;
                console.log(`  Redirecting to: ${newUrl}`);
                downloadImage(newUrl, dest).then(resolve).catch(reject);
            }
            else {
                file.close();
                fs.unlink(dest, () => { });
                reject(new Error(`Server responded with ${response.statusCode}: ${url}`));
            }
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

async function main() {
    console.log(`Reading colors from ${INPUT_FILE}`);
    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    const productId = data.productId;
    const colors = data.colors;

    console.log(`Found ${colors.length} colors for product ${productId}`);

    // Structure: customink-images/products/<productId>/color-<colorId>/<view>.png

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const color of colors) {
        const colorId = color.colorId;
        const colorDir = path.join(OUTPUT_BASE_DIR, productId, `color-${colorId}`);

        console.log(`Processing color ${color.colorName} (${colorId})...`);

        // Image views to download
        const views = [
            { name: 'front_large_extended.png', url: color.imageUrls.front },
            { name: 'back_large_extended.png', url: color.imageUrls.back },
            { name: 'sleeve_large_extended.png', url: color.imageUrls.sleeve }
        ];

        for (const view of views) {
            const dest = path.join(colorDir, view.name);
            try {
                const result = await downloadImage(view.url, dest);
                if (result === 'downloaded') successCount++;
                else skipCount++;
            } catch (err) {
                console.error(`  Error downloading ${view.name}: ${err.message}`);
                failCount++;
            }
            // Be nice to the server
            await new Promise(r => setTimeout(r, 100)); // 100ms delay
        }
    }

    console.log('------------------------------------------------');
    console.log('Download Summary');
    console.log(`Total Success: ${successCount}`);
    console.log(`Total Skipped: ${skipCount}`);
    console.log(`Total Failed:  ${failCount}`);
}

main().catch(console.error);
