/**
 * DeliveryReturns Component - Redbubble Style
 * [2025-11-19 09:10:00] 参考图一：配送时效和退货政策
 */
'use client';

import Link from 'next/link';
import styles from './DeliveryReturns.module.css';

interface DeliveryInfo {
  estimatedDate: string;
  country: string;
  countryFlag: string;
  shippingOptions?: Array<{
    name: string;
    days: string;
    price: number;
    free: boolean;
  }>;
}

interface ReturnsInfo {
  policy: string;
  url: string;
}

interface DeliveryReturnsProps {
  delivery: DeliveryInfo;
  returns: ReturnsInfo;
}

export function DeliveryReturns({ delivery, returns }: DeliveryReturnsProps) {
  return (
    <div className={styles.deliveryReturns}>
      {/* [2025-11-19 09:10:00] 参考图一位置：配送信息 */}
      <div className={styles.deliveryReturnsDelivery}>
        <div className={styles.deliveryReturnsLabel}>Delivery</div>
        <div className={styles.deliveryReturnsContent}>
          <span className={styles.deliveryReturnsFlag} aria-hidden="true">{delivery.countryFlag}</span>
          <span className={styles.deliveryReturnsDate}>{delivery.estimatedDate}</span>
        </div>
      </div>

      {/* [2025-11-19 09:10:00] 参考图一位置：退货政策 */}
      <div className={styles.deliveryReturnsReturns}>
        <Link href={returns.url} className={styles.deliveryReturnsLink}>
          {returns.policy}
        </Link>
      </div>
    </div>
  );
}

