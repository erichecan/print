
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const colorName = formData.get('colorName') as string;
        const view = formData.get('view') as string; // front, back, sleeve
        const file = formData.get('file') as File;

        if (!colorName || !view || !file) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Normalize color slug: "Forest Green" -> "forest-green"
        const colorSlug = colorName.toLowerCase().trim().replace(/\s+/g, '-');
        const productSlug = 'gildan-softstyle-tshirt';

        // GCS path
        const gcsPath = `gs://print-main-product-images/design-lab-products/${productSlug}/${colorSlug}/${view}-large_extended.png`;

        // Save file locally temporarily
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'product-upload-'));
        const tempFilePath = path.join(tempDir, file.name);

        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(tempFilePath, buffer);

        console.log(`[Admin Upload] Uploading to ${gcsPath}...`);

        // Use gsutil to upload
        // We use -h "Cache-Control:public, max-age=31536000" and -h "Content-Type:image/png"
        const { stdout, stderr } = await execAsync(`gsutil -h "Cache-Control:public, max-age=31536000" cp "${tempFilePath}" "${gcsPath}"`);

        // Clean up
        await fs.rm(tempDir, { recursive: true, force: true });

        if (stderr && !stderr.includes('Copying')) {
            console.error('[Admin Upload] gsutil error:', stderr);
            return NextResponse.json({ error: stderr }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Uploaded to ${colorSlug}/${view}`,
            path: gcsPath
        });

    } catch (error: any) {
        console.error('Error in image upload API:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
