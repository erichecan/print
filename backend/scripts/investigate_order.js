const prisma = require('../src/lib/prisma');

async function main() {
  const order = await prisma.offlineOrder.findUnique({
    where: { orderCode: 'OFF-260123-02' },
    include: {
      histories: {
        orderBy: { changedAt: 'asc' }
      }
    }
  });
  
  if (!order) {
    console.log('Order not found');
    return;
  }
  
  console.log('=== Full Order Details ===');
  console.log('Order Code:', order.orderCode);
  console.log('Company:', order.company);
  console.log('Contact Name:', order.contactName);
  console.log('Phone:', order.phone);
  console.log('Email:', order.email);
  console.log('Project Name:', order.projectName);
  console.log('Primary Product:', order.primaryProduct);
  console.log('Created At:', order.createdAt);
  console.log('Updated At:', order.updatedAt);
  console.log('Configuration:', JSON.stringify(order.configuration, null, 2));
  console.log('Metadata:', JSON.stringify(order.metadata, null, 2));
  console.log('\n=== Stage History ===');
  for (const h of order.histories) {
    console.log(h.changedAt, '|', h.fromStage, '->', h.toStage, '| Notes:', h.notes);
  }
}

main().catch(console.error).finally(() => process.exit(0));
