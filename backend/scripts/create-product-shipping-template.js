/**
 * Create a sample product-specific shipping template
 * 
 * This script demonstrates how to create a shipping template
 * that only applies when specific products are in the cart.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createProductShippingTemplate() {
    console.log('🚀 Creating product-specific shipping template...\n');

    try {
        // First, get some sample products (you can replace these with actual product IDs)
        const products = await prisma.product.findMany({
            where: {
                isActive: true,
                deleted: false,
            },
            take: 3,
            select: {
                id: true,
                name: true,
                sku: true,
            },
        });

        if (products.length === 0) {
            console.log('⚠️  No products found. Please create some products first.');
            return;
        }

        console.log(`Found ${products.length} products to use for demo:`);
        products.forEach((p, i) => {
            console.log(`  ${i + 1}. ${p.name} (${p.sku})`);
        });
        console.log('');

        // Create a product-specific shipping template
        const template = await prisma.shippingTemplate.create({
            data: {
                name: 'Heavy Item Shipping',
                description: 'Special shipping rates for heavy/bulky items',
                priority: 90, // Higher priority than standard templates
                isActive: true,
                rules: {
                    create: [
                        // Canada - Heavy Item
                        {
                            country: 'CA',
                            provinces: [],
                            shippingMethod: 'standard',
                            estimatedDays: 10,
                            cost: 24.99,
                            isFreeShipping: false,
                        },
                        // USA - Heavy Item
                        {
                            country: 'US',
                            provinces: [],
                            shippingMethod: 'standard',
                            estimatedDays: 12,
                            cost: 29.99,
                            isFreeShipping: false,
                        },
                    ],
                },
                products: {
                    create: products.map(product => ({
                        productId: product.id,
                    })),
                },
            },
            include: {
                rules: true,
                products: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                            },
                        },
                    },
                },
            },
        });

        console.log('✅ Created product-specific shipping template:\n');
        console.log(`Template: ${template.name}`);
        console.log(`Priority: ${template.priority}`);
        console.log(`Rules: ${template.rules.length}`);
        console.log(`Products: ${template.products.length}\n`);

        console.log('Associated Products:');
        template.products.forEach((tp, i) => {
            console.log(`  ${i + 1}. ${tp.product.name} (${tp.product.sku})`);
        });
        console.log('');

        console.log('Shipping Rules:');
        template.rules.forEach((rule, i) => {
            console.log(`  ${i + 1}. ${rule.country}: $${rule.cost} (${rule.estimatedDays} days)`);
        });
        console.log('');

        console.log('🎉 Product-specific shipping template created successfully!\n');
        console.log('💡 How it works:');
        console.log('   When any of the associated products are in the cart,');
        console.log('   this template will be used instead of the standard shipping rates.\n');

    } catch (error) {
        console.error('❌ Failed to create template:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run if called directly
if (require.main === module) {
    createProductShippingTemplate()
        .then(() => {
            console.log('✅ Script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = { createProductShippingTemplate };
