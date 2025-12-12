// [2025-01-31 19:50:00] 订单颜色级别印刷配置类型定义
// [2025-12-19] 扩展：支持按颜色分组的印刷位管理和per-size overrides

export type PrintPosition = 
  | 'front' 
  | 'back' 
  | 'left_sleeve' 
  | 'right_sleeve' 
  | 'pocket' 
  | 'tag_inside' 
  | 'tag_outside' 
  | 'custom';

// [2025-12-19] 印刷位置键类型（用于per-size overrides）
export type PositionKey = 'front' | 'back' | 'left_sleeve' | 'right_sleeve' | 'pocket' | 'tag_inside' | 'tag_outside' | 'custom';

// [2025-12-19] 位置配置（支持新的按颜色分组模式）
export type PositionConfig = {
  positionKey: PositionKey;
  enabled: boolean;
  method: 'DTF' | 'Screen' | 'Embroidery' | 'UV' | 'Vinyl' | '其他';
  widthMm?: number; // 宽度（毫米）
  heightMm?: number; // 高度（毫米）
  inkOrFilm?: string; // 油墨/胶膜类型
  unitPrice: number; // 单价
  designAssetId?: string | null; // 设计稿引用ID
  notes?: string; // 备注
  dstFileFee?: number; // DST File Fee（仅Embroidery）
};

// [2025-12-19] 按颜色分组的订单项配置
export type OrderItemColorGroup = {
  id: string; // 颜色组ID
  colorCode: string; // 颜色代码
  colorName: string; // 颜色名称
  quantities: Record<string, number>; // 尺码 -> 数量映射
  positions: PositionConfig[]; // 该颜色组的默认印刷位置配置
  perSizeOverrides?: Array<{ // per-size overrides（可选）
    size: string; // 尺码：'XS'|'S'|'M'|'L'|'XL'|'2XL'|'3XL'|...
    overrides: PositionConfig[]; // 该尺码的覆盖配置
  }>;
  inheritFromPrevious?: boolean; // [2025-12-19] 是否继承上一个颜色的配置
  inheritsFromColorId?: string | null; // [2025-12-19] 继承自哪个颜色组ID
};

export type PrintConfig = {
  position: PrintPosition;
  areaSize: { widthCm: number; heightCm: number };
  offset?: { x: number; y: number };
  methodSpecific?: {
    dtfLayers?: { whiteUnderbase: boolean; passes?: number };
    screen?: { colorsCount: number };
    embroidery?: { stitches: number };
  };
  notes?: string;
};

export type SizeQty = { 
  sizeCode: string; 
  qty: number 
};

export type SizeOverride = { 
  sizeCode: string; 
  overridePrintConfigs: PrintConfig[]; 
  reason?: string 
};

export type OrderItemColorInput = {
  colorCode: string;
  colorName: string;
  printConfigs: PrintConfig[];
  sizeBreakdown: SizeQty[];
  allowSizeOverrides?: boolean;
  sizeOverrides?: SizeOverride[];
};

export type OrderItemPayload = { 
  productId: string; 
  printMethod: 'dtf' | 'screen' | 'embroidery'; 
  colors: OrderItemColorInput[] 
};

export type PricingBreakdown = { 
  total: number; 
  currency: 'USD' | 'CAD'; 
  batches: Array<{ 
    colorCode: string; 
    positionsKey: string; 
    totalQty: number; 
    unitPrice: number; 
    subtotal: number 
  }> 
};

export type ValidationResult = { 
  level: 'error' | 'warn'; 
  code: string; 
  message: string; 
  path?: string 
};

// [2025-12-19] 定价计算结果
export type PricingCalculationResult = {
  total: number; // 总价
  currency: 'CAD' | 'USD'; // 货币
  breakdown: Array<{ // 分项明细
    color: string; // 颜色名称
    size: string; // 尺码
    quantity: number; // 数量
    positions: PositionConfig[]; // 生效的印刷位置配置
    subtotal: number; // 该颜色+尺码的小计
  }>;
};

// [2025-12-19] 颜色组更新操作
export type ColorGroupUpdateAction = 
  | { type: 'update'; groupId: string; updates: Partial<OrderItemColorGroup> }
  | { type: 'inherit'; fromGroupId: string; toGroupId: string }
  | { type: 'copy'; fromGroupId: string; toGroupIds: string[] }
  | { type: 'togglePerSize'; groupId: string; enabled: boolean };
