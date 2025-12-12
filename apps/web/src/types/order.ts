// [2025-01-31 19:50:00] 订单颜色级别印刷配置类型定义

export type PrintPosition = 
  | 'front' 
  | 'back' 
  | 'left_sleeve' 
  | 'right_sleeve' 
  | 'pocket' 
  | 'tag_inside' 
  | 'tag_outside' 
  | 'custom';

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
