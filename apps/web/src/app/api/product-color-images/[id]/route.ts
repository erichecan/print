import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await prisma.productColorImage.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Successfully deleted color mapping' });
    } catch (error: any) {
        console.error('Failed to delete color mapping:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
