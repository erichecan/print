/**
 * Custom Ink Image Utilities (GCS Backed)
 * [2025-12-20] Refactored to use GCS hosted images directly.
 * Custom Ink Dependencies have been removed from runtime logic.
 */

// Base Configuration
const GCS_BASE_URL = 'https://storage.googleapis.com/print-main-product-images';
const PRODUCT_SLUG = 'gildan-softstyle-tshirt';

// View & Size Types (Simplified)
export type ViewType = 'front' | 'back' | 'sleeve';
export type ImageSize = 'large_extended';

/**
 * Generate GCS Image URL
 * Pattern: design-lab-products/{slug}/{color-slug}/{view}-large_extended.png
 */
function getGcsUrl(colorName: string, view: ViewType): string {
  // Normalize color name: "Forest Green" -> "forest-green"
  const colorSlug = (colorName || 'White').toLowerCase().trim().replace(/\s+/g, '-');

  // Normalize view: map 'sleeve', 'left', 'right' all to 'sleeve' if needed, or keep strictly 'sleeve'
  // Our migration script used 'sleeve'
  const normalizedView = view === 'sleeve' ? 'sleeve' : view;

  return `${GCS_BASE_URL}/design-lab-products/${PRODUCT_SLUG}/${colorSlug}/${normalizedView}-large_extended.png`;
}

/**
 * Get Image URL for a specific color and view
 * This is the main function used by Design Lab
 */
export function getDefaultProductImageUrl(
  colorName: string | null = 'White',
  view: ViewType = 'front'
): string {
  return getGcsUrl(colorName || 'White', view);
}

/**
 * Get all base images (front, back, sleeve) for a color
 * Used when initializing the canvas or switching colors
 */
export function getDefaultProductBaseImages(colorName: string | null = 'White'): {
  front: string;
  back: string;
  sleeve: string;
} {
  const safeColor = colorName || 'White';
  return {
    front: getGcsUrl(safeColor, 'front'),
    back: getGcsUrl(safeColor, 'back'),
    sleeve: getGcsUrl(safeColor, 'sleeve'),
  };
}

/**
 * Get Thumbnail URL (re-uses large image, browser resizes)
 * In future we could generate actual thumbnails.
 */
export function getThumbnailImageUrl(
  colorName: string | null = 'White',
  view: ViewType = 'front'
): string {
  return getGcsUrl(colorName || 'White', view);
}

// --- Deprecated / Legacy Exports (kept for compatibility during refactor) ---

export const GILDAN_SOFTSTYLE_PRODUCT_ID = 'legacy-id-not-used';

export function getColorIdSync(colorName: string | null): string {
  return '000000'; // Dummy ID
}

export async function getProductImageUrlFromAPI(
  colorName: string | null,
  view: ViewType
): Promise<string | null> {
  return getDefaultProductImageUrl(colorName, view);
}

export async function getProductBaseImagesFromAPI(
  colorName: string | null
): Promise<{ front: string; back: string; sleeve: string } | null> {
  return getDefaultProductBaseImages(colorName);
}

