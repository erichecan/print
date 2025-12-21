
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Design Save Test ---');

    // 1. Check if we have any variants
    const variants = await prisma.variant.findMany({ take: 1, include: { product: true } });
    if (variants.length === 0) {
        console.error('❌ No variants found in database. Cannot test design creation.');
        return;
    }
    const validVariant = variants[0];
    console.log(`✅ Found valid variant: ${validVariant.id} (Product: ${validVariant.product.name})`);

    // 2. Simulate Frontend logic: what if we send 'default'?
    // We expect this to fail in the backend if 'default' is not a valid UUID or ID.
    console.log('Testing createDesignDraft logic with "default"...');
    try {
        const defaultVariant = await prisma.variant.findUnique({
            where: { id: 'default' }
        });
        console.log('Result for id="default":', defaultVariant);
    } catch (e) {
        console.log('Error looking up "default":', e.message);
    }

    // 3. Simulate create design with valid variant
    console.log('Creating design with valid variant...');
    const designData = {
        productVariantId: validVariant.id,
        name: 'Test Design ' + Date.now(),
        canvas: { objects: [] },
        pricing: null
    };

    // We can't easily call the controller directly without mocking req/res, 
    // but we can simulate the DB calls the controller makes.

    // Controller Logic:
    const variantCheck = await prisma.variant.findUnique({
        where: { id: designData.productVariantId },
        include: {
            product: {
                select: {
                    name: true,
                    basePrice: true,
                    isCustomizable: true,
                    isActive: true
                }
            }
        }
    });

    if (!variantCheck || !variantCheck.product?.isCustomizable || !variantCheck.product?.isActive) {
        console.error('❌ Controller would reject: Variant not customizable or active');
    } else {
        console.log('✅ Controller would accept this variant.');

        // Simulate DB create
        try {
            const design = await prisma.design.create({
                data: {
                    sessionId: 'test-session-' + Date.now(),
                    variant: { connect: { id: validVariant.id } },
                    name: designData.name,
                    status: 'DRAFT',
                    currentVersion: 1,
                    canvasSnapshot: designData.canvas,
                    pricingSnapshot: designData.pricing
                }
            });
            console.log('✅ Design created successfully in DB:', design.id);

            // Cleanup
            await prisma.design.delete({ where: { id: design.id } });
            console.log('Cleanup successful');
        } catch (err) {
            console.error('❌ DB Create failed:', err);
        }
    }

}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
