/**
 * BuyBox Component - Redbubble Style
* 参考图一：价格/样式/颜色/尺码/数量/加入购物车/立即购买
 */
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './BuyBox.module.css';
import { buildNewDesignUrlSafe } from '@/utils/designUrl';

interface Price {
  original: number;
  sale: number;
  currency: string;
  discountPercent: number;
  endsSoon: boolean;
  endsSoonText?: string;
}

interface StyleOption {
  value: string;
  label: string;
  description: string;
}

interface Color {
  name: string;
  hex: string;
  available: boolean;
  imageUrl?: string;
}

interface Size {
  value: string;
  label: string;
  stock: number;
  available: boolean;
}

interface PrintLocation {
  value: string;
  label: string;
}

interface BuyBoxProps {
  title: string;
  artistName: string;
  artistShopUrl: string;
  price: Price;
  style: {
    name: string;
    description: string;
    options: StyleOption[];
  };
  colors: Color[];
  sizes: Size[];
  printLocations: PrintLocation[];
  rating: {
    average: number;
    count: number;
  };
  onAddToCart: (payload: any) => void;
  onBuyNow: (payload: any) => void;
  onStartDesign?: (payload: any) => void;
  variantId?: string; // 添加 variantId 支持
  productId?: string; // 添加 productId 支持
  variants?: any[];
}

export function BuyBox({
  title,
  artistName,
  artistShopUrl,
  price,
  style,
  colors,
  sizes,
  printLocations,
  rating,
  onAddToCart,
  onBuyNow,
  onStartDesign,
  variantId,
  productId,
  variants = [],
}: BuyBoxProps) {
  const router = useRouter();
  const [selectedStyle, setSelectedStyle] = useState(style.options[0]?.value || '');
  const [selectedColor, setSelectedColor] = useState(colors.find(c => c.available)?.name || '');

  // Logic to determine available sizes based on selected color
  const getAvailableSizesForColor = (color: string) => {
    if (!variants || variants.length === 0) return sizes.filter(s => s.available).map(s => s.value);

    return variants
      .filter(v => {
        const vColor = (v.color || '').toLowerCase().trim();
        const tColor = (color || '').toLowerCase().trim();
        return vColor === tColor && v.stockQuantity > 0;
      })
      .map(v => (v.size || '').toUpperCase()); // Normalized size values
  };

  const availableSizesForColor = getAvailableSizesForColor(selectedColor);

  const [selectedSize, setSelectedSize] = useState(() => {
    const initialSizes = getAvailableSizesForColor(colors.find(c => c.available)?.name || '');
    return initialSizes.length > 0 ? initialSizes[0] : '';
  });

  const [quantity, setQuantity] = useState(1);

  // Get current specific variant
  const currentVariant = variants.find(v => {
    const vColor = (v.color || '').toLowerCase().trim();
    const tColor = (selectedColor || '').toLowerCase().trim();
    const vSize = (v.size || '').toLowerCase().trim();
    const tSize = (selectedSize || '').toLowerCase().trim();
    return vColor === tColor && vSize === tSize;
  });

  const maxQuantity = currentVariant ? currentVariant.stockQuantity : 1;
  const canAddToCart = selectedSize && selectedColor && quantity > 0 && quantity <= maxQuantity && !!currentVariant;

  const handleColorSelect = (newColor: string) => {
    setSelectedColor(newColor);

    // Check if current size is valid for new color
    const newAvailableSizes = getAvailableSizesForColor(newColor);
    const isCurrentSizeValid = newAvailableSizes.some(s => s.toLowerCase() === selectedSize.toLowerCase());

    if (!isCurrentSizeValid) {
      // Select first available size for this color, or empty
      setSelectedSize(newAvailableSizes.length > 0 ? newAvailableSizes[0] : '');
    }
  };

  const handleAddToCart = useCallback(() => {
    if (!canAddToCart) return;

    const payload = {
      productId: productId || 'prod-001',
      title,
      selectedStyle,
      color: selectedColor,
      size: selectedSize,
      quantity,
      unitPrice: price.sale,
      salePrice: price.sale,
      originalPrice: price.original,
      currency: price.currency,
      variantId: currentVariant?.id
    };

    console.log('[BuyBox] Add to Cart payload:', payload);
    onAddToCart(payload);
  }, [canAddToCart, title, selectedStyle, selectedColor, selectedSize, quantity, price, onAddToCart, productId, currentVariant]);

  const handleBuyNow = useCallback(() => {
    if (!canAddToCart) return;

    const payload = {
      productId: productId || 'prod-001',
      title,
      selectedStyle,
      color: selectedColor,
      size: selectedSize,
      quantity,
      unitPrice: price.sale,
      salePrice: price.sale,
      originalPrice: price.original,
      currency: price.currency,
      variantId: currentVariant?.id
    };

    console.log('[BuyBox] Buy Now payload:', payload);
    onBuyNow(payload);
  }, [canAddToCart, title, selectedStyle, selectedColor, selectedSize, quantity, price, onBuyNow, productId, currentVariant]);

  // 开始设计处理函数 - 跳转到新的 Design Lab 页面
  const handleStartDesign = useCallback(() => {
    const payload = {
      productId: productId || 'prod-001',
      title,
      selectedStyle,
      color: selectedColor,
      size: selectedSize,
      // 移除 printLocation（模块已移除）
    };

    console.log('[Start Design]', payload);

    // 如果父组件提供了 onStartDesign 回调，优先使用
    if (onStartDesign) {
      onStartDesign(payload);
      return;
    }

    // 如果没有 variantId，显示错误提示
    if (!variantId) {
      console.error('[BuyBox] variantId is required for Start Design');
      alert('Unable to start design: Product variant not selected. Please select a color and size.');
      return;
    }

    try {
      // 使用新的 URL 构建函数
      const designUrl = buildNewDesignUrlSafe({
        variantId,
        productId: productId || undefined,
        color: selectedColor || undefined,
        size: selectedSize || undefined,
        referrer: 'product_detail',
      });

      // 使用 router.push 进行客户端导航
      router.push(designUrl);
    } catch (error) {
      console.error('[BuyBox] Failed to build design URL:', error);
      alert('Unable to start design. Please try again.');
    }
  }, [title, selectedStyle, selectedColor, selectedSize, onStartDesign, variantId, productId, router]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: price.currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <aside className={styles.buybox} aria-label="Purchase options">
      {/* 参考图一位置：商品标题 */}
      <h1 className={styles.buyboxTitle}>{title}</h1>

      {/* 参考图一位置：设计/艺术家行 */}
      <div className={styles.buyboxArtist}>
        Designed and sold by{' '}
        <Link href={artistShopUrl} className={styles.buyboxArtistLink}>
          {artistName}
        </Link>
      </div>

      {/* 参考图一位置：价格（原价+现价+折扣+ends soon） */}
      <div className={styles.buyboxPrice}>
        <div className={styles.buyboxPriceMain}>
          <span className={styles.buyboxPriceSale}>{formatPrice(price.sale)}</span>
          {price.discountPercent > 0 && (
            <span className={styles.buyboxPriceOriginal}>{formatPrice(price.original)}</span>
          )}
        </div>
        {price.endsSoon && (
          <div className={styles.buyboxPriceBadge}>{price.endsSoonText || `${price.discountPercent}% off ends soon`}</div>
        )}
      </div>

      {/* 参考图一位置：评分 */}
      <div className={styles.buyboxRating} aria-label={`${rating.average} out of 5 stars, ${rating.count} reviews`}>
        <div className={styles.buyboxRatingStars} aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`${styles.buyboxStar} ${i < Math.floor(rating.average) ? styles.filled : ''} ${i < rating.average && i >= Math.floor(rating.average) ? styles.half : ''}`}
            >
              ★
            </span>
          ))}
        </div>
        <span className={styles.buyboxRatingValue}>{rating.average.toFixed(2)}</span>
        <span className={styles.buyboxRatingCount}>({rating.count} reviews)</span>
      </div>

      {/* 参考图一位置：Style下拉 */}
      <div className={styles.buyboxField}>
        <label htmlFor="style-select" className={styles.buyboxLabel}>
          Style
        </label>
        <select
          id="style-select"
          className={styles.buyboxSelect}
          value={selectedStyle}
          onChange={(e) => setSelectedStyle(e.target.value)}
          aria-label="Select product style"
        >
          {style.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className={styles.buyboxDescription}>{style.description}</p>
      </div>

      {/* 参考图一位置：Color 圆形色块 */}
      <div className={styles.buyboxField}>
        <label className={styles.buyboxLabel}>Color</label>
        <div className={styles.buyboxColors} role="radiogroup" aria-label="Select color">
          {colors.map((color) => (
            <button
              key={color.name}
              className={`${styles.buyboxColor} ${selectedColor === color.name ? styles.isSelected : ''} ${!color.available ? styles.isUnavailable : ''}`}
              onClick={() => color.available && handleColorSelect(color.name)}
              disabled={!color.available}
              aria-label={`Select color ${color.name}`}
              aria-pressed={selectedColor === color.name}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* 参考图一位置：Size（S–3XL）+ Size Guide */}
      <div className={styles.buyboxField}>
        <div className={styles.buyboxSizeHeader}>
          <label className={styles.buyboxLabel}>Size</label>
          <Link href="/size-guide" target="_blank" className={styles.buyboxSizeGuide}>Size Guide</Link>
        </div>
        <div className={styles.buyboxSizes} role="radiogroup" aria-label="Select size">
          {sizes.map((size) => {
            // Check robust availability relative to selected color
            const isAvailableForColor = availableSizesForColor.some(s => s.toLowerCase() === size.value.toLowerCase());
            const isGloballyAvailable = size.available; // Fallback if no variants provided

            // Is selectable if it exists in the variants for this color (or fallback global)
            const isSelectable = variants && variants.length > 0 ? isAvailableForColor : isGloballyAvailable;

            return (
              <button
                key={size.value}
                className={`${styles.buyboxSize} ${selectedSize === size.value ? styles.isSelected : ''} ${!isSelectable ? styles.isUnavailable : ''}`}
                onClick={() => isSelectable && setSelectedSize(size.value)}
                disabled={!isSelectable}
                aria-label={`Select size ${size.label}${!isSelectable ? ' (out of stock)' : ''}`}
                aria-pressed={selectedSize === size.value}
              >
                {size.label}
                {!isSelectable && <span className={styles.buyboxSizeUnavailable}>Out of stock</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 移除 Print Location 模块（按需求） */}

      {/* 参考图一位置：数量步进器 */}
      <div className={styles.buyboxField}>
        <label htmlFor="quantity-input" className={styles.buyboxLabel}>
          Quantity
        </label>
        <div className={styles.buyboxQuantity}>
          <button
            type="button"
            className={styles.buyboxQuantityBtn}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            −
          </button>
          <input
            id="quantity-input"
            type="number"
            min="1"
            max={maxQuantity}
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1;
              setQuantity(Math.max(1, Math.min(maxQuantity, val)));
            }}
            className={styles.buyboxQuantityInput}
            aria-label="Quantity"
          />
          <button
            type="button"
            className={styles.buyboxQuantityBtn}
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            disabled={quantity >= maxQuantity}
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        {currentVariant && (
          <p className={styles.buyboxStockInfo}>
            {currentVariant.stockQuantity} {currentVariant.stockQuantity === 1 ? 'item' : 'items'} in stock
          </p>
        )}
      </div>

      {/* 三个按钮同一行：Start design, Add to cart, Buy now */}
      <div className={styles.buyboxButtons}>
        {/* 开始设计按钮 */}
        <button
          type="button"
          className={styles.buyboxStartDesign}
          onClick={handleStartDesign}
          aria-label="Start custom design"
        >
          Start design
        </button>

        {/* 参考图一位置：加入购物车按钮 */}
        <button
          type="button"
          className={styles.buyboxAddToCart}
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          aria-label="Add to cart"
        >
          Add to cart
        </button>

        {/* 立即购买按钮（可选） */}
        <button
          type="button"
          className={styles.buyboxBuyNow}
          onClick={handleBuyNow}
          disabled={!canAddToCart}
          aria-label="Buy now"
        >
          Buy now
        </button>
      </div>

      {!canAddToCart && (
        <p className={styles.buyboxError} role="alert">
          Please select a color and size to continue.
        </p>
      )}
    </aside>
  );
}

