/**
 * [2025-12-19] 颜色组数据转换工具
 * 将现有的ProductColor数据结构转换为OrderItemColorGroup格式
 */
import { OrderItemColorGroup, PositionConfig } from '@/types/order';

// [2025-12-19] 定义本地类型（避免循环依赖）
type ProductColor = {
  colorId: string;
  colorName: string;
  availableSizes: string[];
  sizes: SizeQuantity[];
  totalQuantity: number;
  totalPrice: number;
};

type SizeQuantity = {
  size: string;
  quantity: number;
  unitPrice: number;
  additionalFee: number;
  subtotal: number;
};

/**
 * 将ProductColor转换为OrderItemColorGroup
 */
export function convertProductColorToColorGroup(
  productColor: ProductColor,
  existingGroups?: OrderItemColorGroup[]
): OrderItemColorGroup {
  // [2025-12-19] 将sizes数组转换为quantities对象
  const quantities: Record<string, number> = {};
  productColor.sizes.forEach(sizeQty => {
    quantities[sizeQty.size] = sizeQty.quantity;
  });

  // [2025-12-19] 查找是否已有该颜色的配置（用于继承）
  const existingGroup = existingGroups?.find(g => g.colorCode === productColor.colorId);

  return {
    id: existingGroup?.id || `${productColor.colorId}-${Date.now()}`,
    colorCode: productColor.colorId,
    colorName: productColor.colorName,
    quantities,
    positions: existingGroup?.positions || [], // [2025-12-19] 如果已有配置，保留；否则为空
    perSizeOverrides: existingGroup?.perSizeOverrides,
    inheritFromPrevious: false
  };
}

/**
 * 将ProductColor数组转换为OrderItemColorGroup数组
 */
export function convertProductColorsToColorGroups(
  productColors: ProductColor[],
  existingGroups?: OrderItemColorGroup[]
): OrderItemColorGroup[] {
  return productColors.map(color => 
    convertProductColorToColorGroup(color, existingGroups)
  );
}

/**
 * 将OrderItemColorGroup转换回ProductColor格式（用于提交）
 */
export function convertColorGroupToProductColor(
  colorGroup: OrderItemColorGroup,
  availableSizes: string[]
): ProductColor {
  // [2025-12-19] 将quantities对象转换回sizes数组
  const sizes: SizeQuantity[] = availableSizes
    .filter(size => colorGroup.quantities[size] > 0)
    .map(size => ({
      size,
      quantity: colorGroup.quantities[size],
      unitPrice: 0, // [2025-12-19] 单价从positions中计算
      additionalFee: 0,
      subtotal: 0 // [2025-12-19] 小计从定价服务计算
    }));

  const totalQuantity = Object.values(colorGroup.quantities).reduce((sum, qty) => sum + qty, 0);

  return {
    colorId: colorGroup.colorCode,
    colorName: colorGroup.colorName,
    availableSizes,
    sizes,
    totalQuantity,
    totalPrice: 0 // [2025-12-19] 总价从定价服务计算
  };
}
