import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const colors = await prisma.productColorImage.findMany({
            orderBy: {
                colorName: 'asc',
            },
        });

        // Transform to frontend format if needed, or return as is.
        // Frontend expects: { name: string, hex: string, ... }
        // DB has: { colorName: string, colorHex: string, ... }

        const mappedColors = colors.map(c => ({
            name: c.colorName,
            hex: c.colorHex || '#FFFFFF', // Default to white if null
            availableSizes: ['S', 'M', 'L', 'XL', '2XL'], // Default sizes
            isAvailable: true,
            imageUrls: c.imageUrls
        }));

        return NextResponse.json(mappedColors);
    } catch (error: any) {
        console.error('Failed to fetch product colors:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
