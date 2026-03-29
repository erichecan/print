/**
 * backfill-offline-orders-prd-v2.js
 * 
 * 作用：
 * 1. 从 OfflineOrder.configuration (JSON) 中提取字段并回填到数据库列中。
 * 2. 为缺失 ProductionWorkOrder 的订单创建 WorkOrder。
 * 3. 针对 COMPLETED 订单自动平衡定金。
 * 
 * 用法：
 * NODE_ENV=production node scripts/backfill-offline-orders-prd-v2.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dry-run');

function generateWorkOrderCode() {
    const timestamp = new Date();
    const datePart = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `WO-${datePart}-${randomPart}`;
}

async function main() {
    console.log(isDryRun ? '🧪 DRY RUN MODE' : '🚀 EXECUTION MODE');
    console.log('🌱 Starting Offline Order Backfill (PRD v2.0)...');

    const orders = await prisma.offlineOrder.findMany({
        include: {
            productionWorkOrder: true,
        },
    });

    console.log(`🔍 Found ${orders.length} offline orders to process.`);

    let updatedCount = 0;
    let workOrderCreatedCount = 0;

    for (const order of orders) {
        const config = order.configuration || {};
        const pricing = config.pricing || {};

        // 1. 提取字段
        const rushFee = parseFloat(order.rush_fee || config.rushFee || pricing.rushFee || 0);
        const dstFileFee = parseFloat(order.dst_file_fee || config.dstFileFee || pricing.dstFileFee || 0);
        const paymentMethod = order.payment_method || config.paymentMethod || null;
        const referenceNumber = order.reference_number || config.referenceNumber || null;
        let depositAmount = parseFloat(order.deposit_amount || config.depositAmount || 0);

        // 自动平衡逻辑：对于已完成订单，确保定金 = 总额
        if (order.status === 'COMPLETED') {
            const productItems = config.productItems || [];
            const discount = config.discount || 0;
            const taxRate = config.taxRate || 0.13;
            const requiresInvoice = config.requiresInvoice || false;

            const subtotal = productItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
            const discountAmount = (subtotal * discount) / 100;
            const taxBase = subtotal - discountAmount + dstFileFee;
            const taxAmount = requiresInvoice ? taxBase * taxRate : 0;
            const calculatedTotal = taxBase + taxAmount;

            if (depositAmount < calculatedTotal) {
                console.log(`   [Balance] Order ${order.orderCode} (COMPLETED): ${depositAmount} -> ${calculatedTotal}`);
                depositAmount = calculatedTotal;
            }
        }

        const orderNotes = order.order_notes || config.orderNotes || config.artworkNotes || null;

        // 检查是否有实质性更新
        const needsUpdate =
            parseFloat(order.rush_fee || 0) !== rushFee ||
            parseFloat(order.dst_file_fee || 0) !== dstFileFee ||
            order.payment_method !== paymentMethod ||
            order.reference_number !== referenceNumber ||
            parseFloat(order.deposit_amount || 0) !== depositAmount ||
            order.order_notes !== orderNotes;

        if (needsUpdate) {
            if (!isDryRun) {
                await prisma.offlineOrder.update({
                    where: { id: order.id },
                    data: {
                        rush_fee: rushFee,
                        dst_file_fee: dstFileFee,
                        payment_method: paymentMethod,
                        reference_number: referenceNumber,
                        deposit_amount: depositAmount,
                        order_notes: orderNotes,
                        // 同步回 configuration 确保详情页一致
                        configuration: {
                            ...config,
                            depositAmount: depositAmount,
                            orderNotes: orderNotes
                        }
                    },
                });
            }
            updatedCount++;
        }

        // 2. 检查 ProductionWorkOrder
        if (!order.productionWorkOrder) {
            if (!isDryRun) {
                let workOrderStatus = 'PLANNING';
                if (order.status === 'COMPLETED') workOrderStatus = 'COMPLETED';
                if (order.status === 'CANCELLED') workOrderStatus = 'CANCELLED';

                await prisma.productionWorkOrder.create({
                    data: {
                        offlineOrderId: order.id,
                        workOrderCode: generateWorkOrderCode(),
                        status: workOrderStatus,
                        startDate: order.createdAt,
                        dueDate: order.deliveryDate || null,
                    }
                });
            }
            workOrderCreatedCount++;
        }
    }

    console.log(`\n✅ Backfill completed:`);
    console.log(`   Orders updated: ${updatedCount}`);
    console.log(`   WorkOrders created: ${workOrderCreatedCount}`);
}

main()
    .catch((err) => {
        console.error('❌ Backfill failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
