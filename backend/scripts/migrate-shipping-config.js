/**
 * Data Migration Script: Convert existing shipping settings to database records
 * 
 * This script migrates the existing JSON-based shipping configuration
 * to the new ShippingTemplate and ShippingRule database tables.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_SHIPPING_SETTINGS = {
    standard: {
        enabled: true,
        cost: 9.99,
        costUS: 12.99,
        costIntl: 15.99,
        estimatedDaysCA: 7,
        estimatedDaysUS: 10,
    },
    express: {
        enabled: true,
        cost: 19.99,
        costUS: 24.99,
        costIntl: 29.99,
        estimatedDaysCA: 3,
        estimatedDaysUS: 5,
    },
};

async function migrateShippingConfig() {
    console.log('🚀 Starting shipping configuration migration...\n');

    try {
        // Check if templates already exist
        const existingTemplates = await prisma.shippingTemplate.count();
        if (existingTemplates > 0) {
            console.log(`⚠️  Found ${existingTemplates} existing templates. Skipping migration.`);
            console.log('   Delete existing templates first if you want to re-run this migration.\n');
            return;
        }

        // Create Standard Shipping Template
        console.log('📦 Creating Standard Shipping template...');
        const standardTemplate = await prisma.shippingTemplate.create({
            data: {
                name: 'Standard Shipping',
                description: 'Default standard shipping rates for all regions',
                priority: 50,
                isActive: true,
                rules: {
                    create: [
                        // Canada Standard
                        {
                            country: 'CA',
                            provinces: [],
                            shippingMethod: 'standard',
                            estimatedDays: DEFAULT_SHIPPING_SETTINGS.standard.estimatedDaysCA,
                            cost: DEFAULT_SHIPPING_SETTINGS.standard.cost,
                            isFreeShipping: false,
                        },
                        // USA Standard
                        {
                            country: 'US',
                            provinces: [],
                            shippingMethod: 'standard',
                            estimatedDays: DEFAULT_SHIPPING_SETTINGS.standard.estimatedDaysUS,
                            cost: DEFAULT_SHIPPING_SETTINGS.standard.costUS,
                            isFreeShipping: false,
                        },
                        // International Standard
                        {
                            country: 'INTL',
                            provinces: [],
                            shippingMethod: 'standard',
                            estimatedDays: 12,
                            cost: DEFAULT_SHIPPING_SETTINGS.standard.costIntl,
                            isFreeShipping: false,
                        },
                    ],
                },
            },
            include: {
                rules: true,
            },
        });
        console.log(`✅ Created Standard Shipping template with ${standardTemplate.rules.length} rules\n`);

        // Create Express Shipping Template
        console.log('📦 Creating Express Shipping template...');
        const expressTemplate = await prisma.shippingTemplate.create({
            data: {
                name: 'Express Shipping',
                description: 'Expedited shipping rates for faster delivery',
                priority: 60,
                isActive: true,
                rules: {
                    create: [
                        // Canada Express
                        {
                            country: 'CA',
                            provinces: [],
                            shippingMethod: 'express',
                            estimatedDays: DEFAULT_SHIPPING_SETTINGS.express.estimatedDaysCA,
                            cost: DEFAULT_SHIPPING_SETTINGS.express.cost,
                            isFreeShipping: false,
                        },
                        // USA Express
                        {
                            country: 'US',
                            provinces: [],
                            shippingMethod: 'express',
                            estimatedDays: DEFAULT_SHIPPING_SETTINGS.express.estimatedDaysUS,
                            cost: DEFAULT_SHIPPING_SETTINGS.express.costUS,
                            isFreeShipping: false,
                        },
                        // International Express
                        {
                            country: 'INTL',
                            provinces: [],
                            shippingMethod: 'express',
                            estimatedDays: 7,
                            cost: DEFAULT_SHIPPING_SETTINGS.express.costIntl,
                            isFreeShipping: false,
                        },
                    ],
                },
            },
            include: {
                rules: true,
            },
        });
        console.log(`✅ Created Express Shipping template with ${expressTemplate.rules.length} rules\n`);

        // Create a sample "Free Shipping" template for orders over $100
        console.log('📦 Creating Free Shipping (Promotional) template...');
        const freeShippingTemplate = await prisma.shippingTemplate.create({
            data: {
                name: 'Free Shipping Over $100',
                description: 'Free standard shipping for orders $100 and above',
                priority: 70, // Higher priority than standard
                isActive: true,
                rules: {
                    create: [
                        {
                            country: 'ALL',
                            provinces: [],
                            minOrderAmount: 100.00,
                            shippingMethod: 'standard',
                            estimatedDays: 7,
                            cost: 0,
                            isFreeShipping: true,
                        },
                    ],
                },
            },
            include: {
                rules: true,
            },
        });
        console.log(`✅ Created Free Shipping template with ${freeShippingTemplate.rules.length} rule\n`);

        // Summary
        console.log('🎉 Migration completed successfully!\n');
        console.log('Summary:');
        console.log(`  - Standard Shipping: ${standardTemplate.rules.length} rules`);
        console.log(`  - Express Shipping: ${expressTemplate.rules.length} rules`);
        console.log(`  - Free Shipping: ${freeShippingTemplate.rules.length} rule`);
        console.log(`  - Total templates: 3`);
        console.log(`  - Total rules: ${standardTemplate.rules.length + expressTemplate.rules.length + freeShippingTemplate.rules.length}\n`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration
if (require.main === module) {
    migrateShippingConfig()
        .then(() => {
            console.log('✅ Migration script completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateShippingConfig };
