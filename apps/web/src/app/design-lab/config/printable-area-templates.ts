// All coordinates use top-left origin on a 1200×1440 canvas.
// Values are calibrated so each area fits within the physical printable region of
// the smallest garment size (XS/S), ensuring designs print without clipping on any size.
// The constraint system converts these to center-relative offsets at render time.

export type GarmentType =
  | 'tshirt'
  | 'vneck'
  | 'hoodie'
  | 'crewneck'
  | 'long_sleeve'
  | 'tank_top'
  | 'kids_tshirt'
  | 'kids_hoodie'
  | 'tote_bag';

export type ViewKey = 'front' | 'back' | 'left-sleeve' | 'right-sleeve' | 'sleeve';

export interface AreaConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ViewAreaMap = Partial<Record<ViewKey, AreaConfig>>;

// Human-readable labels for the admin dropdown
export const GARMENT_TYPE_LABELS: Record<GarmentType, string> = {
  tshirt: 'T-Shirt (Adult)',
  vneck: 'V-Neck (Adult)',
  hoodie: 'Hoodie',
  crewneck: 'Crewneck Sweatshirt',
  long_sleeve: 'Long Sleeve Shirt',
  tank_top: 'Tank Top',
  kids_tshirt: 'T-Shirt (Kids)',
  kids_hoodie: 'Hoodie (Kids)',
  tote_bag: 'Tote Bag',
};

export const GARMENT_TYPES = Object.keys(GARMENT_TYPE_LABELS) as GarmentType[];

export const PRINTABLE_AREA_TEMPLATES: Record<GarmentType, ViewAreaMap> = {
  tshirt: {
    front: { x: 327, y: 240, width: 546, height: 960 },
    back: { x: 327, y: 240, width: 546, height: 960 },
    'left-sleeve': { x: 350, y: 470, width: 500, height: 500 },
    'right-sleeve': { x: 350, y: 470, width: 500, height: 500 },
  },
  vneck: {
    // Neckline sits slightly lower; front area is shorter at the top
    front: { x: 327, y: 280, width: 546, height: 900 },
    back: { x: 327, y: 240, width: 546, height: 960 },
  },
  hoodie: {
    // Kangaroo pocket + hood reduce usable height on the front
    front: { x: 350, y: 300, width: 500, height: 820 },
    back: { x: 327, y: 240, width: 546, height: 900 },
    'left-sleeve': { x: 370, y: 500, width: 400, height: 400 },
    'right-sleeve': { x: 370, y: 500, width: 400, height: 400 },
  },
  crewneck: {
    front: { x: 327, y: 260, width: 546, height: 900 },
    back: { x: 327, y: 240, width: 546, height: 960 },
    'left-sleeve': { x: 370, y: 500, width: 400, height: 400 },
    'right-sleeve': { x: 370, y: 500, width: 400, height: 400 },
  },
  long_sleeve: {
    front: { x: 327, y: 240, width: 546, height: 960 },
    back: { x: 327, y: 240, width: 546, height: 960 },
    'left-sleeve': { x: 350, y: 450, width: 460, height: 460 },
    'right-sleeve': { x: 350, y: 450, width: 460, height: 460 },
  },
  tank_top: {
    // Narrower garment with no sleeves; sides slope inward more
    front: { x: 360, y: 240, width: 480, height: 960 },
    back: { x: 360, y: 240, width: 480, height: 960 },
  },
  kids_tshirt: {
    // Smaller body = significantly reduced printable area
    front: { x: 390, y: 370, width: 420, height: 700 },
    back: { x: 390, y: 370, width: 420, height: 700 },
    'left-sleeve': { x: 430, y: 530, width: 300, height: 300 },
    'right-sleeve': { x: 430, y: 530, width: 300, height: 300 },
  },
  kids_hoodie: {
    front: { x: 400, y: 390, width: 400, height: 620 },
    back: { x: 390, y: 370, width: 420, height: 700 },
    'left-sleeve': { x: 440, y: 560, width: 280, height: 280 },
    'right-sleeve': { x: 440, y: 560, width: 280, height: 280 },
  },
  tote_bag: {
    // Square-ish panel; no sleeves
    front: { x: 300, y: 300, width: 600, height: 720 },
    back: { x: 300, y: 300, width: 600, height: 720 },
  },
};

/**
 * Look up the printable area config for a given garment type and view.
 * Returns null if the combination doesn't exist in the template (e.g. tank top + sleeve).
 */
export function getTemplateArea(
  garmentType: string | null | undefined,
  view: string
): AreaConfig | null {
  if (!garmentType) return null;
  const template = PRINTABLE_AREA_TEMPLATES[garmentType as GarmentType];
  if (!template) return null;
  // Normalize legacy 'sleeve' key: try exact match first, fall back to left-sleeve
  const area = template[view as ViewKey] ?? template['left-sleeve'] ?? null;
  return area ?? null;
}
