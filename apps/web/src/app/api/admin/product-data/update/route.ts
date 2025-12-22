
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const { colors } = await req.json();

        if (!Array.isArray(colors)) {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        // Path to the file
        const filePath = path.join(process.cwd(), 'src/lib/product-data.ts');

        // Generate file content
        const fileContent = `export interface ProductColor {
    name: string;
    hex: string;
    availableSizes: string[];
    isAvailable: boolean;
}

export const PRODUCT_COLORS: ProductColor[] = ${JSON.stringify(colors, null, 4)};
`;

        fs.writeFileSync(filePath, fileContent, 'utf-8');

        return NextResponse.json({ success: true, message: 'File updated successfully' });
    } catch (error: any) {
        console.error('Error updating product-data.ts:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
