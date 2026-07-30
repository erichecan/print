// 订单颜色级别印刷配置类型定义
// 扩展：支持按颜色分组的印刷位管理和per-size overrides

export type PrintPosition =
  | 'front'
  | 'back'
  | 'left_sleeve'
  | 'right_sleeve'
  | 'pocket'
  | 'tag_inside'
  | 'tag_outside'
  | 'custom'
  | 'front_left_chest'
  | 'front_middle'
  | 'back_middle';

// 印刷位置键类型（用于per-size overrides）
export type PositionKey =
  | 'front'
  | 'back'
  | 'left_sleeve'
  | 'right_sleeve'
  | 'pocket'
  | 'tag_inside'
  | 'tag_outside'
  | 'custom'
  // New positions
  | 'front_left_chest'
  | 'front_middle'
  | 'back_middle';

// 统一的印刷位置枚举顺序（供位置选择下拉框、悬停示意图等复用，避免各组件各自维护一份）
export const POSITION_KEYS: PositionKey[] = [
  'front_left_chest',
  'front_middle',
  'front',
  'back_middle',
  'back',
  'left_sleeve',
  'right_sleeve',
  'pocket',
  'tag_inside',
  'tag_outside',
  'custom',
];

// 每个印刷位置对应的悬停示意图（静态资源，与具体设计稿内容无关）；custom 无固定示意图
export const POSITION_DIAGRAM_MAP: Partial<Record<PositionKey, string>> = {
  front_left_chest: '/assets/position-diagrams/front_left_chest.svg',
  front_middle: '/assets/position-diagrams/front_middle.svg',
  front: '/assets/position-diagrams/front.svg',
  back_middle: '/assets/position-diagrams/back_middle.svg',
  back: '/assets/position-diagrams/back.svg',
  left_sleeve: '/assets/position-diagrams/left_sleeve.svg',
  right_sleeve: '/assets/position-diagrams/right_sleeve.svg',
  pocket: '/assets/position-diagrams/pocket.svg',
  tag_inside: '/assets/position-diagrams/tag_inside.svg',
  tag_outside: '/assets/position-diagrams/tag_outside.svg',
};

// 位置配置（支持新的按颜色分组模式）
export type PositionConfig = {
  id?: string; // 唯一标识符（用于支持同位置多实例）
  positionKey: PositionKey;
  enabled: boolean;
  method: 'DTF' | 'Screen' | 'Embroidery' | 'UV' | 'Vinyl' | '其他';
  widthMm?: number; // 宽度（毫米）
  heightMm?: number; // 高度（毫米）
  inkOrFilm?: string; // 油墨/胶膜类型
  unitPrice: number; // 单价
  designAssetId?: string | null; // 设计稿引用ID（对应订单 assets 数组中某一项的 id）
  designAssetUrl?: string | null; // 本地态：已上传图片可直接显示的 URL（编辑时来自 order.assets 查找结果）
  notes?: string; // 备注
  dstFileFee?: number; // DST File Fee（仅Embroidery）
  /** 仅前端本地态：用户刚选择、尚未随订单提交上传的设计图文件；提交前会被剥离，不落库 */
  _pendingDesignFile?: File | null;
};

// 按颜色分组的订单项配置
export type OrderItemColorGroup = {
  id: string; // 颜色组ID
  colorCode: string; // 颜色代码
  colorName: string; // 颜色名称
  quantities: Record<string, number>; // 尺码 -> 数量映射
  positions: PositionConfig[]; // 该颜色组的默认印刷位置配置
  unitPrice: number; // 颜色级别的单价（适用于该颜色的所有尺码）
  perSizeOverrides?: Array<{ // per-size overrides（可选）
    size: string; // 尺码：'XS'|'S'|'M'|'L'|'XL'|'2XL'|'3XL'|...
    overrides: PositionConfig[]; // 该尺码的覆盖配置
  }>;
  inheritFromPrevious?: boolean; // 是否继承上一个颜色的配置
  inheritsFromColorId?: string | null; // 继承自哪个颜色组ID
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

// 定价计算结果
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

// 颜色组更新操作
export type ColorGroupUpdateAction =
  | { type: 'update'; groupId: string; updates: Partial<OrderItemColorGroup> }
  | { type: 'inherit'; fromGroupId: string; toGroupId: string }
  | { type: 'copy'; fromGroupId: string; toGroupIds: string[] }
  | { type: 'togglePerSize'; groupId: string; enabled: boolean };
