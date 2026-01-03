const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching colors from DB...");
    const colors = await prisma.productColorImage.findMany({
        orderBy: { colorName: 'asc' }
    });

    console.log(`Found ${colors.length} colors.`);

    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Debug Colors</title>
        <style>
            body { font-family: sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            img { width: 100px; height: auto; display: block; }
            .swatch { width: 50px; height: 50px; border: 1px solid #ccc; }
        </style>
    </head>
    <body>
        <h1>Debug Color Mapping (${colors.length})</h1>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Hex</th>
                    <th>Preview</th>
                    <th>Front</th>
                    <th>Back</th>
                    <th>Sleeve</th>
                </tr>
            </thead>
            <tbody>
    `;

    for (const c of colors) {
        const images = c.imageUrls || {};
        const hex = c.colorHex || '#FFFFFF';

        // Handle variations in key names (left_sleeve vs sleeve)
        const front = images.front || '';
        const back = images.back || '';
        const sleeve = images.sleeve || images.left_sleeve || '';

        html += `
            <tr>
                <td>${c.customInkColorId}</td>
                <td>${c.colorName}</td>
                <td>
                    ${hex}
                    <div class="swatch" style="background-color: ${hex};"></div>
                </td>
                <td><!-- Composite preview if needed --></td>
                <td>${front ? `<a href="${front}" target="_blank"><img src="${front}" /></a>` : 'N/A'}</td>
                <td>${back ? `<a href="${back}" target="_blank"><img src="${back}" /></a>` : 'N/A'}</td>
                <td>${sleeve ? `<a href="${sleeve}" target="_blank"><img src="${sleeve}" /></a>` : 'N/A'}</td>
            </tr>
        `;
    }

    html += `
            </tbody>
        </table>
    </body>
    </html>
    `;

    const outputPath = path.join(__dirname, '../../apps/web/public/debug-colors.html');
    fs.writeFileSync(outputPath, html);
    console.log(`Generated debug file at: ${outputPath}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
