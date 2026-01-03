const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Storage } = require('@google-cloud/storage');
const { PrismaClient } = require('@prisma/client');
const { pipeline } = require('stream');
const { promisify } = require('util');

const streamPipeline = promisify(pipeline);
const prisma = new PrismaClient();

// Configuration
const START_ID = 176100;
const END_ID = 176200;
const BUCKET_NAME = 'print-main-assets';
const TEMP_DIR = path.join(__dirname, 'temp_images');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}

// GCS Setup
const storage = new Storage({
    projectId: 'moonlit-gamma-479502-r6',
});
const bucket = storage.bucket(BUCKET_NAME);

// Common Headers for Axio to mimic browser
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'Referer': 'https://www.customink.com/',
};

// Helper to convert RGB object to Hex
function rgbToHex(rgb) {
    if (!rgb || rgb.red === null || rgb.green === null || rgb.blue === null) return null;
    return "#" + ((1 << 24) + (rgb.red << 16) + (rgb.green << 8) + rgb.blue).toString(16).slice(1).toUpperCase();
}

async function downloadImage(url, localPath) {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            headers: HEADERS
        });
        await streamPipeline(response.data, fs.createWriteStream(localPath));
        console.log(`    Downloaded: ${path.basename(localPath)}`);
        return true;
    } catch (error) {
        // 404 is common for missing views
        if (error.response && error.response.status === 404) {
            // console.warn(`    Image not found (404): ${url}`);
        } else {
            // Log other errors (403/401)
            console.error(`    Download failed for ${url}: ${error.message} status=${error.response?.status}`);
        }
        return false;
    }
}

async function uploadToGCS(localPath, destination) {
    try {
        const [file] = await bucket.upload(localPath, {
            destination,
            metadata: {
                cacheControl: 'public, max-age=31536000',
            },
        });
        // Make public
        await file.makePublic();
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`;
        console.log(`    Uploaded to GCS: ${publicUrl}`);
        return publicUrl;
    } catch (error) {
        console.error(`    GCS Upload failed for ${localPath}:`, error.message);
        return null;
    }
}

async function processStyle(style, customInkProductId = 'unknown_product') {
    const id = style.id;
    let colorName = style.name;
    let colorHex = null;

    if (!colorName) {
        console.warn(`    Skipping Style ${id} with no name.`);
        return false;
    }

    // Filter out apparent Product Names
    if (colorName.includes("T-shirt") || colorName.includes("Jersey")) {
        console.warn(`    Skipping probable Product ID: ${id} Name: ${colorName}`);
        return false;
    }

    if (style.rgbs && style.rgbs.length > 0) {
        colorHex = rgbToHex(style.rgbs[0]);
    }

    console.log(`    Processing Color: ${colorName} (${id}) Hex: ${colorHex}`);

    // Download and Upload Images
    const imageUrls = {
        front: `https://mms-images-prod.imgix.net/mms/images/catalog/colors/${id}/views/alt/front_large_extended.png`,
        back: `https://mms-images-prod.imgix.net/mms/images/catalog/colors/${id}/views/alt/back_large_extended.png`,
        left_sleeve: `https://mms-images-prod.imgix.net/mms/images/catalog/colors/${id}/views/alt/left_sleeve_large_extended.png`,
        right_sleeve: `https://mms-images-prod.imgix.net/mms/images/catalog/colors/${id}/views/alt/right_sleeve_large_extended.png`
    };

    const storedUrls = {};
    const gcsBase = `products/customink/colors/${id}`;
    let hasImages = false;

    for (const [view, url] of Object.entries(imageUrls)) {
        const filename = `${id}_${view}_large_extended.png`;
        const localPath = path.join(TEMP_DIR, filename);
        const gcsPath = `${gcsBase}/${view}_large_extended.png`;

        const downloaded = await downloadImage(url, localPath);
        if (downloaded) {
            hasImages = true;
            const publicUrl = await uploadToGCS(localPath, gcsPath);
            if (publicUrl) {
                storedUrls[view] = publicUrl;
            }
            if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        }
    }

    if (!hasImages) {
        console.warn(`    No images found for ${id}. Skipping DB.`);
        return false;
    }

    // Save to DB
    try {
        const customInkColorId = id.toString();
        await prisma.productColorImage.upsert({
            where: {
                customInkProductId_customInkColorId: {
                    customInkProductId: customInkProductId,
                    customInkColorId: customInkColorId
                }
            },
            update: {
                colorName: colorName,
                colorHex: colorHex,
                imageUrls: storedUrls,
                isVerified: true
            },
            create: {
                customInkProductId: customInkProductId,
                customInkColorId: customInkColorId,
                colorName: colorName,
                colorHex: colorHex,
                imageUrls: storedUrls,
                isVerified: true
            }
        });
        console.log(`    Saved to DB: ${colorName} (${customInkColorId})`);
        return true;
    } catch (dbError) {
        console.error(`    DB Save failed for ${id}:`, dbError.message);
        return false;
    }
}

const { exec } = require('child_process');

async function curlUrl(url, id) {
    const filePath = path.join(TEMP_DIR, `response_${id}.json`);
    // Escape the UA string properly for shell
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    return new Promise((resolve, reject) => {
        exec(`curl -H "User-Agent: ${ua}" "${url}" -o "${filePath}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                // console.log(`  Response size for ${id}: ${content.length} bytes`);
                const data = JSON.parse(content);
                resolve(data);
            } catch (e) {
                reject(new Error(`Failed to parse JSON: ${e.message}`));
            }
        });
    });
}

async function scrapeColorGroup(id, processedIds) {
    console.log(`\nQuerying API for ID: ${id} (via curl file)`);
    const apiUrl = `https://www.customink.com/mms/api/out/v2/styles.json?ids=${id}`;

    try {
        const styles = await curlUrl(apiUrl, id);

        console.log(`  API returned ${styles.length} parent items.`);

        for (const parentStyle of styles) {
            // 1. Process Child Colors if present
            if (parentStyle.colors && Array.isArray(parentStyle.colors)) {
                console.log(`  Found ${parentStyle.colors.length} child colors for Parent ${parentStyle.id}`);

                for (const color of parentStyle.colors) {
                    if (processedIds.has(color.id)) continue;

                    // Pass Parent ID as the Product ID
                    await processStyle(color, parentStyle.id.toString());
                    processedIds.add(color.id);
                }
            }

            // 2. Process Parent itself (if it's not just a container)
            // The parent might be a valid color too, or just a container.
            // processStyle has a filter for "T-shirt", "Jersey" etc.
            if (!processedIds.has(parentStyle.id)) {
                // Try to process it. If it's a generic product name, it will be skipped.
                await processStyle(parentStyle, parentStyle.id.toString());
                processedIds.add(parentStyle.id);
            }
        }

    } catch (error) {
        console.error(`  API Request failed for ${id}:`, error.message);
    }
}

async function main() {
    console.log(`Starting API scrape from ${START_ID} to ${END_ID}...`);
    const processedIds = new Set();

    for (let id = START_ID; id <= END_ID; id++) {
        if (processedIds.has(id)) {
            // console.log(`Skipping ${id} (already processed)`);
            continue;
        }

        await scrapeColorGroup(id, processedIds);

        // Be nice to the API
        const delay = Math.floor(Math.random() * 500) + 200;
        await new Promise(r => setTimeout(r, delay));
    }

    await prisma.$disconnect();
    console.log('Done.');
}

main().catch(console.error);
