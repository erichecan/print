/**
 * Checkout Page
 * [2025-11-05 00:30:00]
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { checkoutApi } from '@/lib/api';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import Image from 'next/image';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

interface ShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

function CheckoutForm({ cart, onSuccess }: { cart: any; onSuccess: (orderNumber: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [selectedShipping, setSelectedShipping] = useState('standard');
  const [totals, setTotals] = useState({
    subtotal: cart.subtotal,
    shipping: 0,
    tax: 0,
    total: cart.subtotal,
  });

  const [address, setAddress] = useState<ShippingAddress>({
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'CA',
  });

  const [sameBilling, setSameBilling] = useState(true);
  const [billingAddress, setBillingAddress] = useState<ShippingAddress>({
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'CA',
  });

  // Fetch shipping rates when address changes
  useEffect(() => {
    if (address.country && address.province && address.postalCode) {
      checkoutApi
        .getShippingRates({
          country: address.country,
          province: address.province,
          postalCode: address.postalCode,
        })
        .then((data: any) => {
          setShippingRates(data.rates || []);
          if (data.rates && data.rates.length > 0) {
            setSelectedShipping(data.rates[0].id);
            setTotals((prev) => ({
              ...prev,
              shipping: data.rates[0].cost,
              total: prev.subtotal + data.rates[0].cost + prev.tax,
            }));
          }
        })
        .catch((err) => console.error('Error fetching shipping rates:', err));
    }
  }, [address.country, address.province, address.postalCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // Create payment intent
      const { clientSecret, paymentIntentId, amount } = await checkoutApi.createPaymentIntent(
        {
          fullName: address.fullName,
          email: address.email,
          phone: address.phone,
          addressLine1: address.addressLine1,
          city: address.city,
          province: address.province,
          postalCode: address.postalCode,
          country: address.country,
        },
        selectedShipping
      );

      // Confirm payment
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card element not found');

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: sameBilling ? address.fullName : billingAddress.fullName,
            email: address.email,
            phone: address.phone,
            address: {
              line1: sameBilling ? address.addressLine1 : billingAddress.addressLine1,
              city: sameBilling ? address.city : billingAddress.city,
              state: sameBilling ? address.province : billingAddress.province,
              postal_code: sameBilling ? address.postalCode : billingAddress.postalCode,
              country: sameBilling ? address.country : billingAddress.country,
            },
          },
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent?.status === 'succeeded') {
        // Confirm order
        const order = await checkoutApi.confirm(
          paymentIntentId,
          {
            fullName: address.fullName,
            email: address.email,
            phone: address.phone,
            addressLine1: address.addressLine1,
            city: address.city,
            province: address.province,
            postalCode: address.postalCode,
            country: address.country,
          },
          sameBilling
            ? {
                fullName: address.fullName,
                email: address.email,
                phone: address.phone,
                addressLine1: address.addressLine1,
                city: address.city,
                province: address.province,
                postalCode: address.postalCode,
                country: address.country,
              }
            : billingAddress,
          selectedShipping,
          address.email
        );

        onSuccess(order.orderNumber);
        router.push(`/orders/${order.orderNumber}?email=${encodeURIComponent(address.email)}`);
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <h1>Shipping Information</h1>

      <div className="form-group">
        <label htmlFor="fullName">Full Name *</label>
        <input
          id="fullName"
          type="text"
          required
          value={address.fullName}
          onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email *</label>
        <input
          id="email"
          type="email"
          required
          value={address.email}
          onChange={(e) => setAddress({ ...address, email: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone *</label>
        <input
          id="phone"
          type="tel"
          required
          value={address.phone}
          onChange={(e) => setAddress({ ...address, phone: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label htmlFor="addressLine1">Street Address *</label>
        <input
          id="addressLine1"
          type="text"
          required
          value={address.addressLine1}
          onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="city">City *</label>
          <input
            id="city"
            type="text"
            required
            value={address.city}
            onChange={(e) => setAddress({ ...address, city: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label htmlFor="province">Province/State *</label>
          <input
            id="province"
            type="text"
            required
            value={address.province}
            onChange={(e) => setAddress({ ...address, province: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label htmlFor="postalCode">Postal Code *</label>
          <input
            id="postalCode"
            type="text"
            required
            value={address.postalCode}
            onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="country">Country *</label>
        <select
          id="country"
          required
          value={address.country}
          onChange={(e) => setAddress({ ...address, country: e.target.value })}
        >
          <option value="CA">Canada</option>
          <option value="US">United States</option>
        </select>
      </div>

      <h2>Delivery Options</h2>
      {shippingRates.map((rate) => (
        <label key={rate.id} className="delivery-option">
          <input
            type="radio"
            name="shipping"
            value={rate.id}
            checked={selectedShipping === rate.id}
            onChange={(e) => {
              setSelectedShipping(e.target.value);
              setTotals((prev) => ({
                ...prev,
                shipping: rate.cost,
                total: prev.subtotal + rate.cost + prev.tax,
              }));
            }}
          />
          <div>
            <strong>{rate.name}</strong>
            <small>${rate.cost.toFixed(2)} • {rate.estimatedDays} days</small>
          </div>
        </label>
      ))}

      <h2>Payment Information</h2>
      <div className="form-group">
        <label>Card Details *</label>
        <div className="card-element-wrapper">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={sameBilling}
          onChange={(e) => setSameBilling(e.target.checked)}
        />
        <span>Billing address same as shipping</span>
      </label>

      {error && <div className="error-message">{error}</div>}

      <button type="submit" disabled={!stripe || loading} className="btn-primary">
        {loading ? 'Processing...' : `Place Order - $${totals.total.toFixed(2)} CAD`}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const { cart, isLoading } = useCart();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!cart || cart.items.length === 0)) {
      router.push('/cart');
    }
  }, [cart, isLoading, router]);

  if (isLoading || !cart || cart.items.length === 0) {
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="checkout-grid">
        <Elements stripe={stripePromise}>
          <CheckoutForm cart={cart} onSuccess={() => {}} />
        </Elements>

        <aside className="checkout-summary">
          <div className="summary-card">
            <h2>Order Summary</h2>
            <div className="order-items">
              {cart.items.map((item: any) => (
                <div key={item.id} className="order-item">
                  {item.thumbnail && (
                    <Image
                      src={item.thumbnail}
                      alt={item.productName}
                      width={60}
                      height={60}
                    />
                  )}
                  <div>
                    <strong>{item.productName}</strong>
                    <small>{item.variantDescription}</small>
                    <small>Qty: {item.quantity}</small>
                  </div>
                  <span>${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <hr />
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${cart.subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="summary-row">
              <span>Tax</span>
              <span>Calculated at checkout</span>
            </div>
            <hr />
            <div className="summary-row total">
              <span>Total</span>
              <span>CAD</span>
            </div>
          </div>
          <div className="trust-note">
            <p>🔒 Your payment information is secure and encrypted</p>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }
        .checkout-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 2rem;
        }
        .checkout-form {
          background: white;
          padding: 2rem;
          border-radius: 8px;
        }
        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
        }
        .delivery-option {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 0.5rem;
          cursor: pointer;
        }
        .card-element-wrapper {
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 1rem 0;
        }
        .btn-primary {
          width: 100%;
          padding: 1rem;
          background: #ff1f3d;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1.1rem;
          cursor: pointer;
          margin-top: 1rem;
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .error-message {
          color: #ff1f3d;
          padding: 1rem;
          background: #ffe5e5;
          border-radius: 4px;
          margin: 1rem 0;
        }
        .summary-card {
          background: #f9f9f9;
          padding: 1.5rem;
          border-radius: 8px;
        }
        .order-item {
          display: flex;
          gap: 1rem;
          padding: 1rem 0;
          border-bottom: 1px solid #eee;
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
        .trust-note {
          margin-top: 1rem;
          text-align: center;
          color: #666;
        }
        @media (max-width: 968px) {
          .checkout-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
