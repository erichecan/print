/**
 * Color Selector Modal - 颜色选择器适配器
 * [2025-12-18 21:18:56] 复用现有的 ProductColorsModal，添加适配层
 */
'use client';

import React from 'react';
import ProductColorsModal from '../../components/modals/ProductColorsModal';
import { getProductColors, type ProductColor } from '../../api/product';

interface ColorSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  selectedColor: string | null;
  onSelectColor: (color: string) => void;
  productName?: string;
  colors?: ProductColor[]; // 可选：直接传入颜色列表
}

const ColorSelectorModal: React.FC<ColorSelectorModalProps> = ({
  isOpen,
  onClose,
  productId,
  selectedColor,
  onSelectColor,
  productName,
  colors: providedColors,
}) => {
  const [colors, setColors] = React.useState<ProductColor[]>(providedColors || []);
  const [loading, setLoading] = React.useState(false);

  // [2025-12-18 21:18:56] 如果提供了颜色列表，直接使用；否则从 API 获取
  React.useEffect(() => {
    if (isOpen && !providedColors && productId) {
      loadColors();
    } else if (providedColors) {
      setColors(providedColors);
    }
  }, [isOpen, productId, providedColors]);

  const loadColors = async () => {
    if (!productId || loading) return;
    
    setLoading(true);
    try {
      const productColors = await getProductColors(productId);
      setColors(productColors);
    } catch (error) {
      console.error('[ColorSelectorModal] Failed to load colors:', error);
      // 可以显示错误提示
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProductColorsModal
      isOpen={isOpen}
      onClose={onClose}
      colors={colors}
      selectedColor={selectedColor}
      onSelectColor={onSelectColor}
      productName={productName}
    />
  );
};

export default ColorSelectorModal;

