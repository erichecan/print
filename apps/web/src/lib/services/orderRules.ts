// [2025-01-31 19:50:00] 订单印刷配置校验规则服务

import type { 
  PrintConfig, 
  PrintPosition, 
  OrderItemPayload, 
  OrderItemColorInput, 
  SizeOverride, 
  ValidationResult 
} from '@/types/order';

export const RULES = {
  maxArea: { 
    front: { w: 30, h: 30 }, 
    back: { w: 30, h: 40 }, 
    left_sleeve: { w: 10, h: 30 }, 
    right_sleeve: { w: 10, h: 30 },
    pocket: { w: 15, h: 15 },
    tag_inside: { w: 6, h: 6 },
    tag_outside: { w: 8, h: 8 },
    custom: { w: 30, h: 40 }, // 默认限制
  },
  screenMaxColors: 6,
  sizeOverrideMaxPerColor: 3,
  allowedPositions: [
    'front',
    'back',
    'left_sleeve',
    'right_sleeve',
    'pocket',
    'tag_inside',
    'tag_outside',
    'custom'
  ] as PrintPosition[],
};

/**
 * [2025-01-31 19:50:00] 检查印刷区域是否超出限制
 */
export function checkAreaLimit(cfg: PrintConfig): string[] {
  const lim = RULES.maxArea[cfg.position];
  if (!lim) return [];
  const errs: string[] = [];
  if (cfg.areaSize.widthCm > lim.w) errs.push(`width exceeds max ${lim.w}cm`);
  if (cfg.areaSize.heightCm > lim.h) errs.push(`height exceeds max ${lim.h}cm`);
  return errs;
}

/**
 * [2025-01-31 19:50:00] 检查工艺特定配置
 */
export function methodChecks(
  method: 'dtf' | 'screen' | 'embroidery',
  cfg: PrintConfig,
  colorCode: string
): string[] {
  const errs: string[] = [];
  if (method === 'dtf') {
    const deepColor = isDeepColor(colorCode);
    if (deepColor && !cfg.methodSpecific?.dtfLayers?.whiteUnderbase) {
      errs.push('deep color requires white underbase');
    }
  } else if (method === 'screen') {
    const c = cfg.methodSpecific?.screen?.colorsCount ?? 1;
    if (c > RULES.screenMaxColors) {
      errs.push(`screen colors exceed ${RULES.screenMaxColors}`);
    }
  } else if (method === 'embroidery') {
    const stitches = cfg.methodSpecific?.embroidery?.stitches ?? 0;
    if (stitches > 20000) {
      errs.push('embroidery stitches too high');
    }
  }
  return errs;
}

/**
 * [2025-01-31 19:50:00] 校验颜色配置
 */
export function validateColorConfigs(colors: OrderItemColorInput[]): { errors: string[] } {
  const errors: string[] = [];
  colors.forEach((c, idx) => {
    c.printConfigs.forEach((cfg, j) => {
      if (!RULES.allowedPositions.includes(cfg.position)) {
        errors.push(`colors[${idx}].printConfigs[${j}].position invalid`);
      }
      errors.push(
        ...checkAreaLimit(cfg).map(e => `colors[${idx}].printConfigs[${j}]: ${e}`)
      );
    });
  });
  return { errors };
}

/**
 * [2025-01-31 19:50:00] 校验尺码覆盖配置
 */
export function validateSizeOverrides(overrides: SizeOverride[]): { errors: string[] } {
  const errors: string[] = [];
  overrides.forEach((o, idx) => {
    if (!o.overridePrintConfigs?.length) {
      errors.push(`overrides[${idx}] empty`);
    }
    o.overridePrintConfigs.forEach((cfg, j) => {
      if (!RULES.allowedPositions.includes(cfg.position)) {
        errors.push(`overrides[${idx}].overridePrintConfigs[${j}].position invalid`);
      }
      errors.push(
        ...checkAreaLimit(cfg).map(e => `overrides[${idx}].overridePrintConfigs[${j}]: ${e}`)
      );
    });
  });
  return { errors };
}

/**
 * [2025-01-31 19:50:00] 校验印刷可行性（包含工艺检查）
 */
export function validatePrintFeasibility(item: OrderItemPayload): ValidationResult[] {
  const out: ValidationResult[] = [];
  item.colors.forEach((c, idx) => {
    c.printConfigs.forEach((cfg, j) => {
      methodChecks(item.printMethod, cfg, c.colorCode).forEach(m => {
        out.push({
          level: 'warn',
          code: 'method',
          message: m,
          path: `colors[${idx}].printConfigs[${j}]`,
        });
      });
    });
    if (c.allowSizeOverrides && (c.sizeOverrides?.length ?? 0) > RULES.sizeOverrideMaxPerColor) {
      out.push({
        level: 'warn',
        code: 'size_override_limit',
        message: `exceeds ${RULES.sizeOverrideMaxPerColor}`,
        path: `colors[${idx}].sizeOverrides`,
      });
    }
  });
  return out;
}

/**
 * [2025-01-31 19:50:00] 判断是否为深色（需要白色底基）
 */
function isDeepColor(colorCode: string): boolean {
  return /black|navy|dark|brown|charcoal/i.test(colorCode);
}
