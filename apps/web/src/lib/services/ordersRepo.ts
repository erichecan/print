// [2025-01-31 19:50:00] 订单数据层服务（Prisma）

import { PrismaClient } from '@prisma/client';
import type { OrderItemColorInput, SizeOverride } from '@/types/order';

// [2025-01-31 19:50:00] 使用全局 prisma 实例，避免在开发环境中创建过多连接
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * [2025-01-31 19:50:00] 批量 upsert 订单项颜色配置
 */
export async function upsertItemColors(
  itemId: string,
  colors: OrderItemColorInput[]
): Promise<void> {
  for (const c of colors) {
    await prisma.orderItemColor.upsert({
      where: {
        orderItemId_colorCode: {
          orderItemId: itemId,
          colorCode: c.colorCode,
        },
      },
      update: {
        colorName: c.colorName,
        allowSizeOverrides: !!c.allowSizeOverrides,
        printConfigs: c.printConfigs as any,
        sizeBreakdown: c.sizeBreakdown as any,
      },
      create: {
        orderItemId: itemId,
        colorCode: c.colorCode,
        colorName: c.colorName,
        allowSizeOverrides: !!c.allowSizeOverrides,
        printConfigs: c.printConfigs as any,
        sizeBreakdown: c.sizeBreakdown as any,
      },
    });
    
    // 处理 sizeOverrides
    if (c.sizeOverrides && c.sizeOverrides.length > 0) {
      const colorRecord = await prisma.orderItemColor.findUnique({
        where: {
          orderItemId_colorCode: {
            orderItemId: itemId,
            colorCode: c.colorCode,
          },
        },
      });
      
      if (colorRecord) {
        await upsertItemColorSizeOverrides(colorRecord.id, c.sizeOverrides);
      }
    }
  }
}

/**
 * [2025-01-31 19:50:00] 批量 upsert 订单项颜色尺码覆盖配置
 */
export async function upsertItemColorSizeOverrides(
  orderItemColorId: number,
  overrides: SizeOverride[]
): Promise<void> {
  for (const o of overrides) {
    await prisma.orderItemColorSizeOverride.upsert({
      where: {
        orderItemColorId_sizeCode: {
          orderItemColorId,
          sizeCode: o.sizeCode,
        },
      },
      update: {
        overridePrintConfigs: o.overridePrintConfigs as any,
        reason: o.reason,
      },
      create: {
        orderItemColorId,
        sizeCode: o.sizeCode,
        overridePrintConfigs: o.overridePrintConfigs as any,
        reason: o.reason,
      },
    });
  }
}

/**
 * [2025-01-31 19:50:00] 获取订单项的所有颜色配置（包含尺码覆盖）
 */
export async function getItemColors(itemId: string) {
  return prisma.orderItemColor.findMany({
    where: { orderItemId: itemId },
    include: {
      sizeOverrides: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}
