/**
 * run-all-backfills.js
 * 
 * 作用：按顺序运行所有回填和 Seed 脚本，确保数据完整。
 * 1. seed-offline-defaults.js (创建默认产品和颜色)
 * 2. backfill-offline-products-from-catalog.js (从主目录同步产品)
 * 3. backfill-offline-orders-prd-v2.js (回填订单字段和工作单)
 */

const { spawn } = require('child_process');
const path = require('path');

const scripts = [
    'seed-offline-defaults.js',
    'backfill-offline-products-from-catalog.js',
    'backfill-offline-orders-prd-v2.js'
];

async function runScript(scriptName) {
    return new Promise((resolve, reject) => {
        console.log(`\n▶️  Running script: ${scriptName}`);
        const scriptPath = path.join(__dirname, scriptName);
        const child = spawn('node', [scriptPath], { stdio: 'inherit' });

        child.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${scriptName} finished successfully.`);
                resolve();
            } else {
                console.error(`❌ ${scriptName} failed with exit code ${code}`);
                reject(new Error(`${scriptName} failed`));
            }
        });
    });
}

async function main() {
    console.log('🚀 Starting all backfill and seed tasks...');

    for (const script of scripts) {
        try {
            await runScript(script);
        } catch (err) {
            console.error('🛑 Stopping execution due to failure.');
            process.exit(1);
        }
    }

    console.log('\n🎉 All backfill tasks completed successfully!\n');
}

main();
