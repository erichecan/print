/**
 * AlsoAvailable Component - Redbubble Style
* 参考图一："Also available on" 横滑卡片
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import styles from './AlsoAvailable.module.css';

interface AlsoAvailableItem {
  id: string;
  type: string;
  url: string;
  price: number;
  salePrice: number;
  discountPercent: number;
  link: string;
}

interface AlsoAvailableProps {
  items: AlsoAvailableItem[];
}

export function AlsoAvailable({ items }: AlsoAvailableProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <section className={styles.alsoAvailable} aria-label="Also available on other products">
      <h2 className={styles.alsoAvailableTitle}>Also available on</h2>
      <div className={styles.alsoAvailableScroll}>
        <div className={styles.alsoAvailableList}>
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.link}
              className={styles.alsoAvailableItem}
              aria-label={`${item.type} - ${formatPrice(item.salePrice)}`}
            >
              <div className={styles.alsoAvailableImageWrapper}>
                <Image
                  src={item.url}
                  alt={item.type}
                  width={200}
                  height={200}
                  className={styles.alsoAvailableImage}
                />
                {item.discountPercent > 0 && (
                  <div className={styles.alsoAvailableBadge}>
                    {item.discountPercent}% off
                  </div>
                )}
              </div>
              <div className={styles.alsoAvailableInfo}>
                <div className={styles.alsoAvailableType}>{item.type}</div>
                <div className={styles.alsoAvailablePrice}>
                  <span className={styles.alsoAvailablePriceSale}>{formatPrice(item.salePrice)}</span>
                  {item.discountPercent > 0 && (
                    <span className={styles.alsoAvailablePriceOriginal}>{formatPrice(item.price)}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

