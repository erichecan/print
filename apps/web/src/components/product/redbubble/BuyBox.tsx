/**
 * BuyBox Component - Redbubble Style
 * [2025-11-19 09:05:00] 参考图一：价格/样式/颜色/尺码/数量/加入购物车/立即购买
 */
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import styles from './BuyBox.module.css';

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
}: BuyBoxProps) {
  const [selectedStyle, setSelectedStyle] = useState(style.options[0]?.value || '');
  const [selectedColor, setSelectedColor] = useState(colors.find(c => c.available)?.name || '');
  const [selectedSize, setSelectedSize] = useState(sizes.find(s => s.available)?.value || '');
  const [selectedPrintLocation, setSelectedPrintLocation] = useState(printLocations[0]?.value || 'front');
  const [quantity, setQuantity] = useState(1);

  const selectedSizeData = sizes.find(s => s.value === selectedSize);
  const maxQuantity = selectedSizeData?.stock || 1;
  const canAddToCart = selectedSize && selectedColor && quantity > 0 && quantity <= maxQuantity;

  const handleAddToCart = useCallback(() => {
    if (!canAddToCart) return;
    
    const payload = {
      productId: 'prod-001', // 从 props 传入
      title,
      selectedStyle,
      color: selectedColor,
      size: selectedSize,
      printLocation: selectedPrintLocation,
      quantity,
      unitPrice: price.sale,
      salePrice: price.sale,
      originalPrice: price.original,
      currency: price.currency,
    };
    
    console.log('[Add to Cart]', payload);
    onAddToCart(payload);
  }, [canAddToCart, title, selectedStyle, selectedColor, selectedSize, selectedPrintLocation, quantity, price, onAddToCart]);

  const handleBuyNow = useCallback(() => {
    if (!canAddToCart) return;
    
    const payload = {
      productId: 'prod-001',
      title,
      selectedStyle,
      color: selectedColor,
      size: selectedSize,
      printLocation: selectedPrintLocation,
      quantity,
      unitPrice: price.sale,
      salePrice: price.sale,
      originalPrice: price.original,
      currency: price.currency,
    };
    
    console.log('[Buy Now]', payload);
    onBuyNow(payload);
  }, [canAddToCart, title, selectedStyle, selectedColor, selectedSize, selectedPrintLocation, quantity, price, onBuyNow]);

  // [2025-11-19 10:00:00] 开始设计处理函数
  const handleStartDesign = useCallback(() => {
    const payload = {
      productId: 'prod-001',
      title,
      selectedStyle,
      color: selectedColor,
      size: selectedSize,
      printLocation: selectedPrintLocation,
    };
    
    console.log('[Start Design]', payload);
    if (onStartDesign) {
      onStartDesign(payload);
    } else {
      // [2025-11-19 11:00:00] 默认跳转到纯原生 Design Lab（如果没有传递 onStartDesign）
      window.location.href = `/design-lab-native.html`;
    }
  }, [title, selectedStyle, selectedColor, selectedSize, selectedPrintLocation, onStartDesign]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: price.currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <aside className={styles.buybox} aria-label="Purchase options">
      {/* [2025-11-19 09:05:00] 参考图一位置：商品标题 */}
      <h1 className={styles.buyboxTitle}>{title}</h1>
      
      {/* [2025-11-19 09:05:00] 参考图一位置：设计/艺术家行 */}
      <div className={styles.buyboxArtist}>
        Designed and sold by{' '}
        <Link href={artistShopUrl} className={styles.buyboxArtistLink}>
          {artistName}
        </Link>
      </div>

      {/* [2025-11-19 09:05:00] 参考图一位置：价格（原价+现价+折扣+ends soon） */}
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

      {/* [2025-11-19 09:05:00] 参考图一位置：评分 */}
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

      {/* [2025-11-19 09:05:00] 参考图一位置：Style下拉 */}
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

      {/* [2025-11-19 09:05:00] 参考图一位置：Color 圆形色块 */}
      <div className={styles.buyboxField}>
        <label className={styles.buyboxLabel}>Color</label>
        <div className={styles.buyboxColors} role="radiogroup" aria-label="Select color">
          {colors.map((color) => (
            <button
              key={color.name}
              className={`${styles.buyboxColor} ${selectedColor === color.name ? styles.isSelected : ''} ${!color.available ? styles.isUnavailable : ''}`}
              onClick={() => color.available && setSelectedColor(color.name)}
              disabled={!color.available}
              aria-label={`Select color ${color.name}`}
              aria-pressed={selectedColor === color.name}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* [2025-11-19 09:05:00] 参考图一位置：Size（S–3XL）+ Size Guide */}
      <div className={styles.buyboxField}>
        <div className={styles.buyboxSizeHeader}>
          <label className={styles.buyboxLabel}>Size</label>
          <Link href="#size-guide" className={styles.buyboxSizeGuide}>Size Guide</Link>
        </div>
        <div className={styles.buyboxSizes} role="radiogroup" aria-label="Select size">
          {sizes.map((size) => (
            <button
              key={size.value}
              className={`${styles.buyboxSize} ${selectedSize === size.value ? styles.isSelected : ''} ${!size.available ? styles.isUnavailable : ''}`}
              onClick={() => size.available && setSelectedSize(size.value)}
              disabled={!size.available}
              aria-label={`Select size ${size.label}${!size.available ? ' (out of stock)' : ''}`}
              aria-pressed={selectedSize === size.value}
            >
              {size.label}
              {!size.available && <span className={styles.buyboxSizeUnavailable}>Out of stock</span>}
            </button>
          ))}
        </div>
      </div>

      {/* [2025-11-19 09:05:00] 参考图一位置：Print Location 单选 */}
      <div className={styles.buyboxField}>
        <label className={styles.buyboxLabel}>Print Location</label>
        <div className={styles.buyboxPrintLocations} role="radiogroup" aria-label="Select print location">
          {printLocations.map((location) => (
            <label key={location.value} className={styles.buyboxPrintLocation}>
              <input
                type="radio"
                name="printLocation"
                value={location.value}
                checked={selectedPrintLocation === location.value}
                onChange={(e) => setSelectedPrintLocation(e.target.value)}
                aria-label={`Print on ${location.label}`}
              />
              <span>{location.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* [2025-11-19 09:05:00] 参考图一位置：数量步进器 */}
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
        {selectedSizeData && (
          <p className={styles.buyboxStockInfo}>
            {selectedSizeData.stock} {selectedSizeData.stock === 1 ? 'item' : 'items'} in stock
          </p>
        )}
      </div>

      {/* [2025-11-19 10:00:00] 三个按钮同一行：Start design, Add to cart, Buy now */}
      <div className={styles.buyboxButtons}>
        {/* [2025-11-19 10:00:00] 开始设计按钮 */}
        <button
          type="button"
          className={styles.buyboxStartDesign}
          onClick={handleStartDesign}
          aria-label="Start custom design"
        >
          Start design
        </button>

        {/* [2025-11-19 09:05:00] 参考图一位置：加入购物车按钮 */}
        <button
          type="button"
          className={styles.buyboxAddToCart}
          onClick={handleAddToCart}
          disabled={!canAddToCart}
          aria-label="Add to cart"
        >
          Add to cart
        </button>

        {/* [2025-11-19 09:05:00] 立即购买按钮（可选） */}
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

