
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { prisma } from '@/lib/prisma';

const execAsync = promisify(exec);
const GCS_BASE_PUBLIC_URL = 'https://storage.googleapis.com/print-main-product-images';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const colorName = formData.get('colorName') as string;
        const view = formData.get('view') as string; // front, back, left_sleeve, right_sleeve
        const file = formData.get('file') as File;

        if (!colorName || !view || !file) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        // Normalize color slug: "Forest Green" -> "forest-green"
        const colorSlug = colorName.toLowerCase().trim().replace(/\s+/g, '-');
        const productSlug = 'gildan-softstyle-tshirt';

        // Normalize View for Filename (legacy/helper compatibility uses hyphens)
        // input 'left_sleeve' -> file 'left-sleeve'
        const normalizedViewFilename = view.replace('_', '-');

        // GCS path
        const relativePath = `design-lab-products/${productSlug}/${colorSlug}/${normalizedViewFilename}-large_extended.png`;
        const gcsPath = `gs://print-main-product-images/${relativePath}`;
        const publicUrl = `${GCS_BASE_PUBLIC_URL}/${relativePath}`;

        // Save file locally temporarily
        const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'product-upload-'));
        const tempFilePath = path.join(tempDir, file.name);

        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(tempFilePath, buffer);

        console.log(`[Upload API] Uploading to ${gcsPath}...`);

        // Use gsutil to upload
        const { stdout, stderr } = await execAsync(`gsutil -h "Cache-Control:public, max-age=31536000" -h "Content-Type:image/png" cp "${tempFilePath}" "${gcsPath}"`);

        // Clean up
        await fs.rm(tempDir, { recursive: true, force: true });

        if (stderr && !stderr.includes('Copying') && !stderr.includes('Operation completed')) {
            console.error('[Upload API] gsutil error:', stderr);
            // return NextResponse.json({ error: stderr }, { status: 500 });
            // gsutil often outputs to stderr on success, so be careful.
        }

        // UPDATE DATABASE
        // Find the record by colorName
        // Note: multiple might exist? Logic should ideally use customInkColorId if available, but here we only have colorName.
        // We'll update all records with this colorName to be safe/consistent, or find the active one.
        const records = await prisma.productColorImage.findMany({
            where: { colorName: colorName }
        });

        if (records.length === 0) {
            console.warn(`[Upload API] No DB record found for ${colorName}, creating one? (Skipping for now)`);
        } else {
            for (const record of records) {
                const currentImages = (record.imageUrls as Record<string, string>) || {};
                const updatedImages = {
                    ...currentImages,
                    [view]: publicUrl // view uses underscores: left_sleeve
                };

                await prisma.productColorImage.update({
                    where: { id: record.id },
                    data: {
                        imageUrls: updatedImages
                    }
                });
                console.log(`[Upload API] Updated DB record ${record.id} with new ${view} URL.`);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Uploaded to ${colorSlug}/${view}`,
            publicUrl: publicUrl
        });

    } catch (error: any) {
        console.error('Error in product-color-images upload:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
