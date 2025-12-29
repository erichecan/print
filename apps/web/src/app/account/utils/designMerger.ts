/**
 * 设计合并工具
 * [2025-01-30 23:50:00] 合并云端和本地设计，去重，支持时间筛选
 */
import type { UserDesign } from '@/lib/api';
import type { LocalDesignDraft } from '@/app/design-lab/utils/localStorage';

/**
 * 合并后的设计数据结构
 * [2025-01-30 23:50:00]
 */
export interface MergedDesign {
  id: string; // 合并后的唯一ID（优先使用云端ID）
  name: string;
  thumbnailUrl?: string | null;
  updatedAt: string; // 最后编辑时间
  productName?: string | null;
  source: 'cloud' | 'local' | 'both'; // 标识来源
  cloudId?: string; // 云端设计ID
  localId?: string; // 本地设计ID
  // 用于编辑时的额外信息
  cloudDesign?: UserDesign;
  localDesign?: LocalDesignDraft;
}

/**
 * 合并云端和本地设计
 * [2025-01-30 23:50:00]
 * @param cloudDesigns 云端设计列表
 * @param localDesigns 本地设计列表
 * @returns 合并后的设计列表
 */
export function mergeDesigns(
  cloudDesigns: UserDesign[],
  localDesigns: LocalDesignDraft[]
): MergedDesign[] {
  const mergedMap = new Map<string, MergedDesign>();

  // 1. 处理云端设计
  cloudDesigns.forEach(cloud => {
    const merged: MergedDesign = {
      id: cloud.id, // 优先使用云端ID
      name: cloud.name,
      thumbnailUrl: cloud.thumbnailUrl,
      updatedAt: cloud.createdAt, // 注意：UserDesign 只有 createdAt，没有 updatedAt
      productName: cloud.productName,
      source: 'cloud',
      cloudId: cloud.id,
      cloudDesign: cloud,
    };
    mergedMap.set(cloud.id, merged);
  });

  // 2. 处理本地设计
  localDesigns.forEach(local => {
    // 尝试通过设计名称和产品ID匹配云端设计
    const matchedCloud = cloudDesigns.find(cloud =>
      cloud.name === local.designName &&
      cloud.productName === local.productInfo.productName
    );

    if (matchedCloud) {
      // 找到匹配的云端设计，合并为 'both'
      const existing = mergedMap.get(matchedCloud.id);
      if (existing) {
        existing.source = 'both';
        existing.localId = local.id;
        existing.localDesign = local;
        // 使用更晚的更新时间
        const localUpdated = new Date(local.updatedAt || local.savedAt);
        const cloudUpdated = new Date(existing.updatedAt);
        if (localUpdated > cloudUpdated) {
          existing.updatedAt = local.updatedAt || local.savedAt;
        }

        // [2025-01-31 03:30:00] Prefer local thumbnail if available, especially for recent edits
        if (local.thumbnailUrl) {
          existing.thumbnailUrl = local.thumbnailUrl;
        }
      }
    } else {
      // 没有匹配的云端设计，作为纯本地设计
      const merged: MergedDesign = {
        id: local.id, // 使用本地ID
        name: local.designName,
        thumbnailUrl: local.thumbnailUrl || null, // [2025-01-31 03:30:00] Use local thumbnail if available
        updatedAt: local.updatedAt || local.savedAt,
        productName: local.productInfo.productName,
        source: 'local',
        localId: local.id,
        localDesign: local,
      };
      mergedMap.set(local.id, merged);
    }
  });

  // 3. 转换为数组并按时间排序
  return Array.from(mergedMap.values()).sort((a, b) => {
    const timeA = new Date(a.updatedAt).getTime();
    const timeB = new Date(b.updatedAt).getTime();
    return timeB - timeA; // 降序：最新的在前
  });
}

/**
 * 按时间筛选设计
 * [2025-01-30 23:50:00]
 * @param designs 设计列表
 * @param days 天数，0表示全部
 * @returns 筛选后的设计列表
 */
export function filterDesignsByDays(
  designs: MergedDesign[],
  days: number
): MergedDesign[] {
  if (days === 0) {
    return designs;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return designs.filter(design => {
    const updatedAt = new Date(design.updatedAt);
    return updatedAt >= cutoffDate;
  });
}

/**
 * 去重设计（基于设计名称和产品名称）
 * [2025-01-30 23:50:00]
 * @param designs 设计列表
 * @returns 去重后的设计列表
 */
export function deduplicateDesigns(designs: MergedDesign[]): MergedDesign[] {
  const seen = new Set<string>();
  return designs.filter(design => {
    const key = `${design.name}_${design.productName || ''}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

