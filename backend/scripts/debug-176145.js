const { exec } = require('child_process');

const ID = 176100; // Parent ID
const TARGET_ID = 176145; // Child ID
const URL = `https://www.customink.com/mms/api/out/v2/styles.json?ids=${ID}`;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function curlUrl(url) {
    return new Promise((resolve, reject) => {
        exec(`curl -H "User-Agent: ${UA}" "${url}"`, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            try {
                const data = JSON.parse(stdout);
                resolve(data);
            } catch (e) {
                reject(new Error(`Failed to parse JSON: ${e.message}`));
            }
        });
    });
}

async function main() {
    console.log(`Fetching Parent ${ID}...`);
    const data = await curlUrl(URL);

    if (data.length > 0) {
        const item = data[0];
        console.log(`Parent ID: ${item.id} Name: ${item.name}`);

        if (item.colors) {
            console.log(`Parent has ${item.colors.length} colors.`);

            // Log Target
            const target = item.colors.find(c => c.id == TARGET_ID);
            if (target) {
                console.log(`\nTARGET (ID ${TARGET_ID}): Name="${target.name}"`);
            } else {
                console.log(`\nTARGET (ID ${TARGET_ID}): NOT FOUND in parent colors.`);
            }

            // Log Ash
            const ash = item.colors.filter(c => c.name && c.name.toLowerCase() === 'ash');
            console.log(`\nASH Colors found: ${ash.length}`);
            ash.forEach(c => console.log(`  ID: ${c.id} Name: ${c.name}`));

            // Dump all for manual check
            console.log("\n--- Full Color List ---");
            item.colors.forEach(c => {
                console.log(`ID: ${c.id} \t Name: ${c.name || 'NULL'}`);
            });
        }
    } else {
        console.log("No data returned.");
    }
}

main();
