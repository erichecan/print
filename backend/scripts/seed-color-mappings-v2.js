require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Data extracted from user's provided production list
const PRODUCTION_COLORS = [
    { name: 'Antique Cherry Red', hex: '#811E36', externalId: '176115' },
    { name: 'Antique Heliconia', hex: '#943962', externalId: '176135' },
    { name: 'Antique Sapphire', hex: '#007D9E', externalId: '176121' },
    { name: 'Azalea', hex: '#E274A5', externalId: '176140' },
    { name: 'Berry', hex: '#6F214B', externalId: '176141' },
    { name: 'Black', hex: '#000000', externalId: '176101' },
    { name: 'Blackberry', hex: '#342D3C', externalId: '176142' },
    { name: 'Cardinal Red', hex: '#922238', externalId: '176112' },
    { name: 'Carolina Blue', hex: '#92B0E6', externalId: '176143' },
    { name: 'Charcoal', hex: '#494949', externalId: '176103' },
    { name: 'Cherry Red', hex: '#D2023E', externalId: '176114' },
    { name: 'Ciel Blue', hex: '#6E79A4', externalId: '176108' },
    { name: 'Coral Silk', hex: '#E76E68', externalId: '176144' },
    { name: 'Cornsilk', hex: '#F1E189', externalId: '176137' },
    { name: 'Daisy', hex: '#ECD45A', externalId: '176145' },
    { name: 'Dark Chocolate', hex: '#413829', externalId: '176134' },
    { name: 'Dark Heather', hex: '#4D4D4D', externalId: '176126' },
    { name: 'Electric Green', hex: '#7CA454', externalId: '176146' },
    { name: 'Forest', hex: '#14370D', externalId: '176127' },
    { name: 'Gold', hex: '#E79628', externalId: '176172' },
    { name: 'Graphite Heather', hex: '#7F7F7F', externalId: '176147' },
    { name: 'Heather Berry', hex: '#B1567C', externalId: '176159' },
    { name: 'Heather Bronze', hex: '#C87A55', externalId: '176160' },
    { name: 'Heather Cardinal Red', hex: '#A04759', externalId: '176148' },
    { name: 'Heather Coral Silk', hex: '#DC8576', externalId: '176161' },
    { name: 'Heather Dark Grey', hex: '#C24146', externalId: '176118' },
    // Note: There are two Heather Dark Greys in source (ID 176118 and 176177). 
    // 176118 has a reddish hex in the text provided (#C24146)? That seems odd for "Dark Grey", 
    // but trusting the explicit hex. The second one (176177) is #545454. 
    // We will keep both, distinguishing by ID in our system if needed, or just let them coexist.
    { name: 'Heather Dark Grey (Reddish)', hex: '#C24146', externalId: '176118' },
    { name: 'Heather Dark Grey', hex: '#545454', externalId: '176177' },
    { name: 'Heather Forest Green', hex: '#6E7963', externalId: '176162' },
    { name: 'Heather Galapagos Blue', hex: '#68969D', externalId: '176163' },
    { name: 'Heather Heliconia', hex: '#BE5269', externalId: '176164' },
    { name: 'Heather Indigo', hex: '#738A9A', externalId: '176149' },
    { name: 'Heather Irish Green', hex: '#5FA66D', externalId: '176129' },
    { name: 'Heather Maroon', hex: '#654751', externalId: '176116' },
    // Duplicate Heather Maroon name
    { name: 'Heather Maroon (Alt)', hex: '#724951', externalId: '176165' },
    { name: 'Heather Military Green', hex: '#74746D', externalId: '176125' },
    { name: 'Heather Navy', hex: '#4C5064', externalId: '176109' },
    { name: 'Heather Orange', hex: '#E77466', externalId: '176120' },
    { name: 'Heather Purple', hex: '#60558F', externalId: '176111' },
    { name: 'Heather Radiant Orchid', hex: '#AD6C8F', externalId: '176166' },
    { name: 'Heather Red', hex: '#A54D58', externalId: '176138' },
    { name: 'Heather Royal', hex: '#4D68A3', externalId: '176107' },
    { name: 'Heather Sapphire', hex: '#5790B4', externalId: '176150' },
    { name: 'Heliconia', hex: '#E5C453', externalId: '176122' },
    { name: 'Ice Grey', hex: '#B7B7B9', externalId: '176168' },
    { name: 'Indigo Blue', hex: '#626C79', externalId: '176110' },
    { name: 'Iris', hex: '#6588C8', externalId: '176151' },
    { name: 'Irish Green', hex: '#3BA658', externalId: '176128' },
    { name: 'Jade Dome', hex: '#008B80', externalId: '176152' },
    { name: 'Kelly Green', hex: '#33755A', externalId: '176169' },
    { name: 'Kiwi', hex: '#85A35B', externalId: '176130' },
    { name: 'Light Blue', hex: '#AFCDF3', externalId: '176106' },
    { name: 'Light Pink', hex: '#E6C7DA', externalId: '176174' },
    { name: 'Lime', hex: '#86B660', externalId: '176153' },
    { name: 'Maroon', hex: '#731F39', externalId: '176154' },
    { name: 'Maroon (Alt)', hex: '#721E38', externalId: '176117' },
    { name: 'Metro Blue', hex: '#3B4165', externalId: '176155' },
    { name: 'Military Green', hex: '#5F6A50', externalId: '176124' },
    { name: 'Mint Green', hex: '#C8EEC1', externalId: '176156' },
    { name: 'Natural', hex: '#E9E3CB', externalId: '176157' },
    { name: 'Navy', hex: '#1C203B', externalId: '176104' },
    { name: 'Off White', hex: '#F2EAD5', externalId: '176181' },
    { name: 'Orange', hex: '#DC582A', externalId: '176119' },
    { name: 'Paragon', hex: '#9F8B95', externalId: '176176' },
    { name: 'Paragon (Alt)', hex: '#F3D3A0', externalId: '176123' },
    { name: 'Pistachio', hex: '#7B6A5A', externalId: '176133' },
    { name: 'Pistachio (Alt)', hex: '#BED8A3', externalId: '176178' },
    { name: 'Purple', hex: '#4F237A', externalId: '176136' },
    { name: 'Red', hex: '#F40928', externalId: '176113' },
    { name: 'Royal', hex: '#395389', externalId: '176105' },
    { name: 'Sage', hex: '#A7ADA3', externalId: '176175' },
    { name: 'Sand', hex: '#D1C8B7', externalId: '176132' },
    { name: 'Sapphire', hex: '#0387B8', externalId: '176139' },
    { name: 'Sky', hex: '#96D2E6', externalId: '176179' },
    { name: 'Sky (Alt)', hex: '#5D9586', externalId: '176131' },
    { name: 'Sport Grey', hex: '#AFAFAF', externalId: '176102' },
    { name: 'Stone Blue', hex: '#8A9EAD', externalId: '176173' },
    { name: 'Tropical Blue', hex: '#219099', externalId: '176158' },
    { name: 'White', hex: '#FFFFFF', externalId: '176200' },
    { name: 'White (Alt)', hex: '#FFFFFF', externalId: '176100' },
];

async function main() {
    console.log('🌱 Starting color mapping seed V2 (High Fidelity)...');

    try {
        const mappings = PRODUCTION_COLORS.map(color => {
            // Create a nicer ID for internal use, but maybe we should store externalId?
            // Since the Schema for mappings is just { id, productColor, values, images }, 
            // and we saw in StepVariants.tsx it wants unique IDs.
            return {
                id: `color-${color.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${color.externalId}`,
                productColor: color.name,
                values: [color.hex],
                images: []
            };
        });

        console.log(`Prepared ${mappings.length} color mappings.`);

        // Upsert setting
        const key = 'site.colorMappings';
        const valueJson = JSON.stringify(mappings);

        const existing = await prisma.$queryRaw`SELECT * FROM settings WHERE key = ${key}`;

        if (existing && existing.length > 0) {
            console.log('Update existing setting (Overwriting with V2 data)...');
            await prisma.$executeRaw`
                UPDATE settings 
                SET value = ${valueJson}::jsonb, updated_at = NOW()
                WHERE key = ${key}
            `;
        } else {
            console.log('Inserting new setting...');
            await prisma.$executeRaw`
                INSERT INTO settings (id, key, value, updated_at)
                VALUES (gen_random_uuid(), ${key}, ${valueJson}::jsonb, NOW())
            `;
        }

        console.log('✅ Color mappings seeded successfully!');

    } catch (error) {
        console.error('❌ Error seeding color mappings:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
