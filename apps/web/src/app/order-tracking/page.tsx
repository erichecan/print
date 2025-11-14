/**
 * Order Tracking Page
 * [2025-11-11 22:33:40] Scaffold
 * [2025-11-12 00:03:00] Hooked into orders API to surface status by order number
 */
'use client';

import { FormEvent, useState } from 'react';
import { ordersApi } from '@/lib/api';

type OrderStatus = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  shippingAddress?: {
    fullName?: string;
    addressLine1?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  };
  shipment?: {
    carrier?: string;
    trackingNumber?: string;
    status?: string;
  };
};

const formatCurrency = (amount: number, currency?: string) =>
  new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency || 'CAD',
  }).format(Number(amount || 0));

export default function OrderTrackingPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderStatus | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setOrder(null);

    if (!orderNumber.trim() || !email.trim()) {
      setError('Please provide both an order number and the email used at checkout.');
      return;
    }

    setLoading(true);
    try {
      const result = await ordersApi.getByOrderNumber(orderNumber.trim(), email.trim());
      setOrder(result as OrderStatus);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'We were unable to find an order with that information.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container order-tracking">
      <div className="order-tracking__hero">
        <h1>Track Your Order</h1>
        <p>
          Enter your order number and the email you used during checkout to view the latest status,
          shipping details, and tracking information.
        </p>
      </div>

      <form className="order-tracking__form" onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="orderNumber">Order Number</label>
          <input
            id="orderNumber"
            name="orderNumber"
            type="text"
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            placeholder="e.g. 100045"
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email@example.com"
            required
          />
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Looking up order...' : 'Track order'}
        </button>
      </form>

      {error && (
        <div className="order-tracking__message order-tracking__message--error">
          <p>{error}</p>
        </div>
      )}

      {order && (
        <div className="order-tracking__result">
          <header>
            <h2>Order #{order.orderNumber}</h2>
            <p>
              Placed on {new Date(order.createdAt).toLocaleDateString()} • {order.status} • Payment{' '}
              {order.paymentStatus}
            </p>
            <p>Total: {formatCurrency(order.total, order.currency)} {order.currency}</p>
          </header>

          {order.shippingAddress && (
            <section>
              <h3>Shipping address</h3>
              <address>
                {order.shippingAddress.fullName && <div>{order.shippingAddress.fullName}</div>}
                {order.shippingAddress.addressLine1 && <div>{order.shippingAddress.addressLine1}</div>}
                {(order.shippingAddress.city || order.shippingAddress.province || order.shippingAddress.postalCode) && (
                  <div>
                    {[order.shippingAddress.city, order.shippingAddress.province, order.shippingAddress.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                )}
                {order.shippingAddress.country && <div>{order.shippingAddress.country}</div>}
              </address>
            </section>
          )}

          {order.shipment && (
            <section>
              <h3>Shipment</h3>
              <p>
                <strong>Carrier:</strong> {order.shipment.carrier || 'TBD'}
              </p>
              <p>
                <strong>Tracking:</strong> {order.shipment.trackingNumber || 'Available once shipped'}
              </p>
              <p>
                <strong>Status:</strong> {order.shipment.status || 'Processing'}
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}