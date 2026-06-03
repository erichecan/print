/**
 * Order Detail Page
 * [2026-01-27] 移除邮箱验证，改为需要登录认证
 */
'use client';

import { useState, useEffect } from 'react';
import { ordersApi } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';

export function OrderDetailContent({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    ordersApi
      .getByOrderNumber(orderNumber)
      .then(setOrder)
      .catch((err) => {
        // 处理未登录错误
        if (err.message?.includes('401') || err.message?.includes('Authentication')) {
          setError('Please login to view this order');
        } else if (err.message?.includes('403')) {
          setError('You do not have permission to view this order');
        } else {
          setError(err.message || 'Failed to load order');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="container">
        <p>Loading order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container">
        <h1>Order Not Found</h1>
        <p>{error || 'Order not found'}</p>
        <Link href="/">Return to Home</Link>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="order-header">
        <h1>Order Confirmation</h1>
        <p className="order-number">Order #{order.orderNumber}</p>
        <p className="order-date">
          Placed on {new Date(order.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="order-toolbar">
        <div className="order-status">
          <div className={`status-badge status-${order.status}`}>
            {order.status}
          </div>
          <div className={`payment-badge payment-${order.paymentStatus}`}>
            Payment: {order.paymentStatus}
          </div>
        </div>
      </div>

      <div className="order-grid">
        <div className="order-items-section">
          <h2>Order Items</h2>
          <div className="order-items">
            {order.items.map((item: any) => (
              <div key={item.id} className="order-item">
                {(item.designThumbnailUrl || item.thumbnail) && (
                  <Image
                    src={item.designThumbnailUrl || item.thumbnail}
                    alt={item.productName}
                    width={100}
                    height={100}
                    className="item-thumb"
                    style={{ flexShrink: 0, objectFit: 'contain' }}
                  />
                )}
                <div className="item-details">
                  <h3>{item.productName}</h3>
                  <p className="variant">{item.variantDescription}</p>
                  <p className="quantity">Quantity: {item.quantity}</p>
                </div>
                <div className="item-price">
                  ${item.subtotal.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="order-summary-section">
          <div className="summary-card">
            <h2>Order Summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>${order.shippingCost.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Tax</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="summary-row">
                <span>Discount</span>
                <span>-${order.discount.toFixed(2)}</span>
              </div>
            )}
            <hr />
            <div className="summary-row total">
              <span>Total</span>
              <span>${order.total.toFixed(2)} {order.currency}</span>
            </div>
          </div>

          <div className="address-card">
            <h2>Shipping Address</h2>
            <address>
              {order.shippingAddress?.fullName && (
                <p>{order.shippingAddress.fullName}</p>
              )}
              {order.shippingAddress?.addressLine1 && (
                <p>{order.shippingAddress.addressLine1}</p>
              )}
              {order.shippingAddress?.city && order.shippingAddress?.province && (
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.province}{' '}
                  {order.shippingAddress.postalCode}
                </p>
              )}
              {order.shippingAddress?.country && (
                <p>{order.shippingAddress.country}</p>
              )}
            </address>
          </div>

          {order.shipment && (
            <div className="tracking-card">
              <h2>Tracking Information</h2>
              <p>
                <strong>Carrier:</strong> {order.shipment.carrier}
              </p>
              <p>
                <strong>Tracking Number:</strong> {order.shipment.trackingNumber}
              </p>
              <p>
                <strong>Status:</strong> {order.shipment.status}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="order-actions">
        <Link href="/products" className="btn btn-primary">
          Continue Shopping
        </Link>
      </div>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }
        .order-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .order-number {
          font-size: 1.5rem;
          font-weight: 600;
          color: #333;
        }
        .order-date {
          color: #666;
        }
        .order-toolbar {
          display: flex;
          gap: 1rem;
          justify-content: center;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        .order-status {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        .status-badge,
        .payment-badge {
          padding: 0.5rem 1rem;
          border-radius: 0;
          font-weight: 500;
        }
        .status-pending {
          background: #fff3cd;
          color: #856404;
        }
        .status-processing {
          background: #cfe2ff;
          color: #084298;
        }
        .status-completed {
          background: #d1e7dd;
          color: #0f5132;
        }
        .payment-completed {
          background: #d1e7dd;
          color: #0f5132;
        }
        .order-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 2rem;
          margin-bottom: 2rem;
        }
        .order-item {
          display: flex;
          gap: 1rem;
          padding: 1.5rem 0;
          border-bottom: 1px solid #eee;
        }
        .item-details h3 {
          margin: 0 0 0.5rem 0;
        }
        .variant {
          color: #666;
          font-size: 0.875rem;
        }
        .item-price {
          font-weight: 600;
          margin-left: auto;
        }
        .summary-card,
        .address-card,
        .tracking-card {
          background: var(--color-bg-sand, #F1EEE9);
          padding: 1.5rem;
          border-radius: 0;
          margin-bottom: 1.5rem;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
        }
        .summary-row.total {
          font-weight: bold;
          font-size: 1.2em;
          margin-top: 1rem;
        }
        address {
          font-style: normal;
        }
        address p {
          margin: 0.5rem 0;
        }
        .order-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        .btn {
          padding: 0.75rem 2rem;
          text-decoration: none;
          border-radius: 0;
          display: inline-block;
        }
        .btn-primary {
          background: #B40C1C;
          color: white;
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-outline {
          border: 1px solid var(--color-border, #DBDBDB);
          color: #333;
        }
        @media (max-width: 968px) {
          .order-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}


