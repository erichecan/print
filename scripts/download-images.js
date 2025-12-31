// Image download helper script
/**
 * Image Download Helper
 * This script helps download images from URLs and save them locally
 * Run this in Node.js environment
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');

const config = require('../assets/content-config.json');

/**
 * Download image from URL
 */
function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      // Create directory if it doesn't exist
      const dir = path.dirname(destPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`✅ Downloaded: ${destPath}`);
        resolve(destPath);
      });
    }).on('error', (err) => {
      console.error(`❌ Error downloading ${url}:`, err.message);
      reject(err);
    });
  });
}

/**
 * Download all images from config
 */
async function downloadAllImages() {
  console.log('📥 Starting image download...\n');

  const downloads = [];

  // Download hero images
  if (config.hero) {
    for (const [key, item] of Object.entries(config.hero)) {
      if (item.url && item.local) {
        const destPath = path.join(__dirname, '..', item.local);
        downloads.push(
          downloadImage(item.url, destPath)
            .catch(err => console.error(`Failed to download hero/${key}:`, err.message))
        );
      }
    }
  }

  // Download product images
  if (config.products) {
    for (const [key, item] of Object.entries(config.products)) {
      if (item.url && item.local) {
        const destPath = path.join(__dirname, '..', item.local);
        downloads.push(
          downloadImage(item.url, destPath)
            .catch(err => console.error(`Failed to download product/${key}:`, err.message))
        );
      }
    }
  }

  await Promise.all(downloads);
  console.log('\n✨ Download complete!');
}

// Run if executed directly
if (require.main === module) {
  downloadAllImages().catch(console.error);
}

module.exports = { downloadImage, downloadAllImages };

