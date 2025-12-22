const { execSync } = require('child_process');
const sharp = require('sharp');
const https = require('https');

// Helper to fetch image buffer
function fetchImage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Status ${res.statusCode}`));
                return;
            }
            const data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
        }).on('error', reject);
    });
}

// Convert RGB to Hex
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

async function analyze() {
    console.log('Fetching folder list...');
    let folders = [];
    try {
        const output = execSync('gsutil ls gs://print-main-product-images/design-lab-products/gildan-softstyle-tshirt/').toString();
        folders = output.split('\n')
            .filter(line => line.trim().length > 0)
            .map(line => {
                const parts = line.split('/');
                return parts[parts.length - 2]; // Get folder name
            });
    } catch (e) {
        console.error('Failed to list folders:', e.message);
        return;
    }

    console.log(`Analyzing ${folders.length} folders...`);
    console.log('Folder, R, G, B, Hex, GuessColor');

    for (const color of folders) {
        if (!color) continue;
        const url = `https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/${color}/front-large_extended.png`;

        try {
            const buffer = await fetchImage(url);

            const image = sharp(buffer);
            const metadata = await image.metadata();

            // Crop center 50x50
            const stats = await image
                .extract({
                    left: Math.floor(metadata.width / 2) - 25,
                    top: Math.floor(metadata.height / 2) - 25,
                    width: 50,
                    height: 50
                })
                .stats();

            const r = stats.channels[0].mean;
            const g = stats.channels[1].mean;
            const b = stats.channels[2].mean;

            // Simple color guess
            let guess = 'Grey/Dark';
            if (r > g + 20 && r > b + 20) guess = 'Reddish';
            if (b > r + 20 && b > g + 20) guess = 'Blueish';
            if (g > r + 20 && g > b + 20) guess = 'Greenish';
            if (r > 200 && g > 200 && b > 200) guess = 'White/Light';
            if (r > g + 20 && g > b + 20) guess = 'Orange/Brown';

            console.log(`${color}, ${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${rgbToHex(r, g, b)}, ${guess}`);
        } catch (e) {
            // console.log(`${color}, ERROR: ${e.message}`);
        }
    }
}

analyze();
