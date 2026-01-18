const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { Storage } = require('@google-cloud/storage');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Config
const INPUT_VARIANTS = './output_v2/product_variants.csv';
const OUTPUT_IMAGES = './output_v2/product_images.csv'; // We will append to this
const GCS_BUCKET_NAME = 'print-482914-images';
const ENABLE_GCS = fs.existsSync('gcs-key.json');

// Views to fetch (Front already fetched)
const VIEWS = ['back', 'left', 'right'];

let storage, bucket;
if (ENABLE_GCS) {
    storage = new Storage({ keyFilename: 'gcs-key.json' });
    bucket = storage.bucket(GCS_BUCKET_NAME);
}

async function uploadToGCS(url, dest) {
    if (!bucket) return url;
    try {
        const file = bucket.file(dest);
        const exists = await file.exists();
        if (exists[0]) return `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${dest}`;

        const response = await axios({ url, method: 'GET', responseType: 'stream' });

        await new Promise((resolve, reject) => {
            response.data.pipe(file.createWriteStream())
                .on('finish', resolve)
                .on('error', reject);
        });
        console.log(`Uploaded ${dest}`);
        return `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${dest}`;
    } catch (e) {
        if (e.response && e.response.status === 404) return null; // Image doesn't exist
        console.error(`Error uploading ${dest}: ${e.message}`);
        return null;
    }
}

async function main() {
    console.log('Starting Extract Images (Back/Left/Right)...');

    // 1. Get Unique Colors & Products
    const uniqueColors = new Map(); // Key: color_id, Value: { productId, colorName, styleId }

    await new Promise((resolve) => {
        fs.createReadStream(INPUT_VARIANTS)
            .pipe(csv())
            .on('data', (row) => {
                if (!uniqueColors.has(row.color_id)) {
                    uniqueColors.set(row.color_id, {
                        productId: row.product_id,
                        colorName: row.color,
                        styleId: row.style_id
                    });
                }
            })
            .on('end', resolve);
    });

    console.log(`Found ${uniqueColors.size} unique colors to check.`);

    // 2. Prepare CSV Appender
    // We assume the file exists, we just want to append new rows.
    // Actually csv-writer overwrites by default? No, append is an option.
    const csvWriter = createCsvWriter({
        path: OUTPUT_IMAGES,
        header: [
            { id: 'id', title: 'id' },
            { id: 'product_id', title: 'product_id' },
            { id: 'variant_id', title: 'variant_id' },
            { id: 'url', title: 'url' },
            { id: 'alt_text', title: 'alt_text' },
            { id: 'is_primary', title: 'is_primary' },
        ],
        append: true
    });

    const newRecords = [];
    const colors = Array.from(uniqueColors.entries());

    // Batch processing
    for (let i = 0; i < colors.length; i++) {
        const [colorId, data] = colors[i];
        console.log(`[${i + 1}/${colors.length}] Checking Color ${colorId} (${data.colorName})...`);

        for (const view of VIEWS) {
            // URL Pattern
            const url = `https://mms-images.out.customink.com/mms/images/catalog/colors/${colorId}/views/alt/${view}_large.png`;
            // Destination
            const dest = `products/${data.styleId}/${colorId}_${view}.png`; // slug not available easily, use styleId

            const gcsUrl = await uploadToGCS(url, dest);

            if (gcsUrl) {
                newRecords.push({
                    id: uuidv4(),
                    product_id: data.productId,
                    variant_id: null,
                    url: gcsUrl,
                    alt_text: `${data.colorName} - ${view}`, // Alt text indicates view
                    is_primary: 'false'
                });
            }
        }

        // Write periodically
        if (newRecords.length >= 20) {
            await csvWriter.writeRecords(newRecords);
            newRecords.length = 0;
        }
    }

    if (newRecords.length > 0) {
        await csvWriter.writeRecords(newRecords);
    }

    console.log('Done!');
}

main();
