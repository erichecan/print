/**
 * Checkout Page
 * [2025-11-05 00:30:00]
 * [2025-11-12 00:45:10] Checkout UX 改造：费用预估、地址持久化、结果页提示
 */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useCart } from '@/contexts/CartContext';
import {
  checkoutApi,
  CheckoutAddressPayload,
  CartResponse,
} from '@/lib/api';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

interface ShippingAddressForm {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

interface CheckoutTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

interface ShippingRate {
  id: string;
  name: string;
  cost: number;
  estimatedDays: number;
}

const emptyTotals: CheckoutTotals = {
  subtotal: 0,
  shipping: 0,
  tax: 0,
  total: 0,
};

const mapAddressForApi = (address: ShippingAddressForm): CheckoutAddressPayload => ({
  fullName: address.fullName,
  email: address.email,
  phone: address.phone,
  addressLine1: address.addressLine1,
  addressLine2: address.addressLine2,
  city: address.city,
  province: address.province,
  postalCode: address.postalCode,
  country: address.country,
}); // [2025-11-12 00:45:10] 统一转换地址数据发送给后端

function CheckoutSkeleton() {
  return (
    <div className="container">
      <div className="checkout-grid">
        <div className="checkout-form skeleton-card" />
        <aside className="checkout-summary">
          <div className="summary-card skeleton-card" />
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
        .skeleton-card {
          min-height: 640px;
          border-radius: 12px;
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%);
          background-size: 400% 100%;
          animation: shimmer 1.6s infinite;
        }
        @keyframes shimmer {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
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

function CheckoutSummary({
  cart,
  totals,
}: {
  cart: CartResponse;
  totals: CheckoutTotals;
}) {
  const shippingText =
    totals.shipping > 0 ? `$${totals.shipping.toFixed(2)}` : 'Calculated at checkout';
  const taxText =
    totals.tax > 0 ? `$${totals.tax.toFixed(2)}` : 'Calculated at checkout';

  return (
    <aside className="checkout-summary">
      <div className="summary-card">
        <h2>Order Summary</h2>
        <div className="order-items">
          {cart.items.map((item) => (
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
          <span>${totals.subtotal.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Shipping</span>
          <span>{shippingText}</span>
        </div>
        <div className="summary-row">
          <span>Tax</span>
          <span>{taxText}</span>
        </div>
        <hr />
        <div className="summary-row total">
          <span>Total</span>
          <span>${totals.total.toFixed(2)} CAD</span>
        </div>
      </div>
      <div className="trust-note">
        <p>🔒 Your payment information is secure and encrypted</p>
      </div>
    </aside>
  );
}

function CheckoutForm({
  cart,
  onTotalsChange,
}: {
  cart: CartResponse;
  onTotalsChange: (totals: CheckoutTotals) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [address, setAddress] = useState<ShippingAddressForm>({
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'CA',
  });
  const [sameBilling, setSameBilling] = useState(true);
  const [billingAddress, setBillingAddress] = useState<ShippingAddressForm>({
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'CA',
  });
  const [totals, setTotals] = useState<CheckoutTotals>({
    subtotal: cart.subtotal,
    shipping: 0,
    tax: 0,
    total: cart.subtotal,
  });
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string>('standard');
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [isCalculatingTotals, setIsCalculatingTotals] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const addressReady = useMemo(() => {
    return (
      address.fullName.trim().length > 0 &&
      address.email.trim().length > 0 &&
      address.phone.trim().length > 0 &&
      address.addressLine1.trim().length > 0 &&
      address.city.trim().length > 0 &&
      address.province.trim().length > 0 &&
      address.postalCode.trim().length > 0 &&
      address.country.trim().length > 0
    );
  }, [address]);

  const notifyTotals = useCallback(
    (nextTotals: CheckoutTotals) => {
      setTotals(nextTotals);
      onTotalsChange(nextTotals);
    },
    [onTotalsChange]
  );

  useEffect(() => {
    const bootstrap = async () => {
      setIsPreparing(true);
      setPrepareError(null);
      try {
        const prepared: any = await checkoutApi.prepare();
        notifyTotals({
          subtotal: prepared.subtotal ?? cart.subtotal,
          shipping: prepared.shipping ?? 0,
          tax: prepared.tax ?? 0,
          total: prepared.total ?? cart.subtotal,
        });
      } catch (error: unknown) {
        setPrepareError(
          error instanceof Error
            ? error.message
            : 'Unable to prepare checkout. Please refresh and try again.'
        );
      } finally {
        setIsPreparing(false);
      }
    };

    bootstrap();
  }, [cart.subtotal, notifyTotals]);

  const refreshTotals = useCallback(
    async (shippingMethod: string) => {
      if (!addressReady) return;
      setIsCalculatingTotals(true);
      setRatesError(null);
      try {
        const result: any = await checkoutApi.prepare({
          shippingAddress: mapAddressForApi(address),
          shippingMethod,
        });
        notifyTotals({
          subtotal: result.subtotal ?? cart.subtotal,
          shipping: result.shipping ?? 0,
          tax: result.tax ?? 0,
          total: result.total ?? cart.subtotal,
        });
      } catch (error: unknown) {
        setRatesError(
          error instanceof Error
            ? error.message
            : 'Failed to calculate totals. Please retry.'
        );
      } finally {
        setIsCalculatingTotals(false);
      }
    },
    [address, addressReady, cart.subtotal, notifyTotals]
  );

  const loadShippingRates = useCallback(async () => {
    if (!addressReady) return;
    setIsFetchingRates(true);
    setRatesError(null);
    try {
      const response: any = await checkoutApi.getShippingRates({
        country: address.country,
        province: address.province,
        postalCode: address.postalCode,
      });
      const rates: ShippingRate[] = response.rates ?? [];
      setShippingRates(rates);
      if (rates.length > 0) {
        setSelectedShipping(rates[0].id);
        await refreshTotals(rates[0].id);
      }
    } catch (error: unknown) {
      setRatesError(
        error instanceof Error
          ? error.message
          : 'Unable to load shipping rates at this time.'
      );
    } finally {
      setIsFetchingRates(false);
    }
  }, [address.country, address.postalCode, address.province, addressReady, refreshTotals]);

  useEffect(() => {
    if (addressReady) {
      loadShippingRates();
    }
  }, [addressReady, loadShippingRates]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    const validationErrors: string[] = [];
    const missing: string[] = [];

    const requiredShipping: Array<[keyof ShippingAddressForm, string]> = [
      ['fullName', 'Full name'],
      ['email', 'Email'],
      ['phone', 'Phone'],
      ['addressLine1', 'Street address'],
      ['city', 'City'],
      ['province', 'Province/State'],
      ['postalCode', 'Postal code'],
      ['country', 'Country'],
    ];

    requiredShipping.forEach(([key, label]) => {
      if (!address[key] || !String(address[key]).trim()) {
        validationErrors.push(`${label} is required.`);
        missing.push(`shipping.${key}`);
      }
    });

    if (!shippingRates.length) {
      validationErrors.push('Shipping options are unavailable. Please double-check the address.');
    }

    if (!selectedShipping) {
      validationErrors.push('Please select a shipping method.');
    }

    if (!sameBilling) {
      const requiredBilling: Array<[keyof ShippingAddressForm, string]> = [
        ['fullName', 'Billing name'],
        ['addressLine1', 'Billing street address'],
        ['city', 'Billing city'],
        ['province', 'Billing province/state'],
        ['postalCode', 'Billing postal code'],
        ['country', 'Billing country'],
      ];

      requiredBilling.forEach(([key, label]) => {
        if (!billingAddress[key] || !String(billingAddress[key]).trim()) {
          validationErrors.push(`${label} is required.`);
          missing.push(`billing.${key}`);
        }
      });
    }

    if (validationErrors.length > 0) {
      setFormErrors(validationErrors);
      setMissingFields(missing);
      setSubmitError('Please correct the highlighted fields before continuing.');
      return;
    }

    setFormErrors([]);
    setMissingFields([]);
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const shippingPayload = mapAddressForApi(address);
      const billingPayload = sameBilling ? shippingPayload : mapAddressForApi(billingAddress);

      const paymentIntentResponse = await checkoutApi.createPaymentIntent(
        shippingPayload,
        selectedShipping
      );

      if (paymentIntentResponse.breakdown) {
        notifyTotals(paymentIntentResponse.breakdown);
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Payment form is not ready. Please reload and try again.');
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        paymentIntentResponse.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: billingPayload.fullName,
              email: billingPayload.email,
              phone: billingPayload.phone,
              address: {
                line1: billingPayload.addressLine1,
                line2: billingPayload.addressLine2,
                city: billingPayload.city,
                state: billingPayload.province,
                postal_code: billingPayload.postalCode,
                country: billingPayload.country,
              },
            },
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent?.status !== 'succeeded') {
        throw new Error('Payment was not completed. Please verify details and retry.');
      }

      const order = await checkoutApi.confirm(
        paymentIntentResponse.paymentIntentId,
        shippingPayload,
        billingPayload,
        selectedShipping,
        shippingPayload.email
      );

      router.push(
        `/checkout/success?orderNumber=${encodeURIComponent(
          order.orderNumber
        )}&email=${encodeURIComponent(shippingPayload.email)}`
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Payment failed. Please try again later.';
      setSubmitError(message);
      router.push(`/checkout/failure?reason=${encodeURIComponent(message)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPreparing) {
    return (
      <div className="checkout-form">
        <p>Preparing checkout…</p>
        {prepareError && <div className="error-message">{prepareError}</div>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <h1>Shipping Information</h1>

      {formErrors.length > 0 && (
        <div className="error-box">
          <p>Please review the following:</p>
          <ul>
            {formErrors.map((err, index) => (
              <li key={index}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="fullName">Full Name *</label>
        <input
          id="fullName"
          type="text"
          required
          className={`field-input${missingFields.includes('shipping.fullName') ? ' is-error' : ''}`}
          value={address.fullName}
          onChange={(event) =>
            setAddress({ ...address, fullName: event.target.value })
          }
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email *</label>
        <input
          id="email"
          type="email"
          required
          className={`field-input${missingFields.includes('shipping.email') ? ' is-error' : ''}`}
          value={address.email}
          onChange={(event) =>
            setAddress({ ...address, email: event.target.value })
          }
        />
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone *</label>
        <input
          id="phone"
          type="tel"
          required
          className={`field-input${missingFields.includes('shipping.phone') ? ' is-error' : ''}`}
          value={address.phone}
          onChange={(event) =>
            setAddress({ ...address, phone: event.target.value })
          }
        />
      </div>

      <div className="form-group">
        <label htmlFor="addressLine1">Street Address *</label>
        <input
          id="addressLine1"
          type="text"
          required
          className={`field-input${missingFields.includes('shipping.addressLine1') ? ' is-error' : ''}`}
          value={address.addressLine1}
          onChange={(event) =>
            setAddress({ ...address, addressLine1: event.target.value })
          }
        />
      </div>

      <div className="form-group">
        <label htmlFor="addressLine2">Apartment, suite, etc. (optional)</label>
        <input
          id="addressLine2"
          type="text"
          className="field-input"
          value={address.addressLine2}
          onChange={(event) =>
            setAddress({ ...address, addressLine2: event.target.value })
          }
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="city">City *</label>
          <input
            id="city"
            type="text"
            required
            className={`field-input${missingFields.includes('shipping.city') ? ' is-error' : ''}`}
            value={address.city}
            onChange={(event) =>
              setAddress({ ...address, city: event.target.value })
            }
          />
        </div>
        <div className="form-group">
          <label htmlFor="province">Province/State *</label>
          <input
            id="province"
            type="text"
            required
            className={`field-input${missingFields.includes('shipping.province') ? ' is-error' : ''}`}
            value={address.province}
            onChange={(event) =>
              setAddress({ ...address, province: event.target.value })
            }
          />
        </div>
        <div className="form-group">
          <label htmlFor="postalCode">Postal Code *</label>
          <input
            id="postalCode"
            type="text"
            required
            className={`field-input${missingFields.includes('shipping.postalCode') ? ' is-error' : ''}`}
            value={address.postalCode}
            onChange={(event) =>
              setAddress({ ...address, postalCode: event.target.value })
            }
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="country">Country *</label>
        <select
          id="country"
          required
          className={`field-input${missingFields.includes('shipping.country') ? ' is-error' : ''}`}
          value={address.country}
          onChange={(event) => setAddress({ ...address, country: event.target.value })}
        >
          <option value="CA">Canada</option>
          <option value="US">United States</option>
        </select>
      </div>

      <h2>Delivery Options</h2>
      <div className="delivery-list">
        {isFetchingRates && <p>Loading shipping options…</p>}
        {ratesError && (
          <div className="error-message">
            <p>{ratesError}</p>
            <button type="button" className="text-button" onClick={() => loadShippingRates()}>
              Retry
            </button>
          </div>
        )}
        {!isFetchingRates && !ratesError && shippingRates.length === 0 && (
          <p>Enter your full address to view available shipping methods.</p>
        )}
        {shippingRates.map((rate) => {
          const estimate = rate.estimatedDays
            ? `${rate.estimatedDays} business day${rate.estimatedDays > 1 ? 's' : ''}`
            : 'Standard delivery';
          return (
            <label
              key={rate.id}
              className={`delivery-option${selectedShipping === rate.id ? ' is-selected' : ''}`}
            >
              <input
                type="radio"
                name="shippingMethod"
                value={rate.id}
                checked={selectedShipping === rate.id}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedShipping(value);
                  void refreshTotals(value);
                }}
              />
              <div className="delivery-option__info">
                <span className="delivery-option__name">{rate.name}</span>
                <span className="delivery-option__meta">
                  <span>{estimate}</span>
                  <strong>${rate.cost.toFixed(2)} CAD</strong>
                </span>
              </div>
            </label>
          );
        })}
      </div>

      <h2>Payment Information</h2>
      <div className="payment-card">
        <label htmlFor="card-element">Card Details *</label>
        <div id="card-element" className="card-element">
          <CardElement options={{ hidePostalCode: true }} />
        </div>
      </div>

      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={sameBilling}
          onChange={(event) => setSameBilling(event.target.checked)}
        />
        <span>Billing address is the same as shipping</span>
      </label>

      {!sameBilling && (
        <div className="billing-card">
          <h3>Billing Address</h3>
          <div className="form-group">
            <label htmlFor="billingFullName">Full Name *</label>
            <input
              id="billingFullName"
              type="text"
              required
              className={`field-input${missingFields.includes('billing.fullName') ? ' is-error' : ''}`}
              value={billingAddress.fullName}
              onChange={(event) =>
                setBillingAddress({ ...billingAddress, fullName: event.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="billingAddress1">Street Address *</label>
            <input
              id="billingAddress1"
              type="text"
              required
              className={`field-input${missingFields.includes('billing.addressLine1') ? ' is-error' : ''}`}
              value={billingAddress.addressLine1}
              onChange={(event) =>
                setBillingAddress({ ...billingAddress, addressLine1: event.target.value })
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="billingAddress2">Apartment, suite, etc. (optional)</label>
            <input
              id="billingAddress2"
              type="text"
              className="field-input"
              value={billingAddress.addressLine2}
              onChange={(event) =>
                setBillingAddress({ ...billingAddress, addressLine2: event.target.value })
              }
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="billingCity">City *</label>
              <input
                id="billingCity"
                type="text"
                required
                className={`field-input${missingFields.includes('billing.city') ? ' is-error' : ''}`}
                value={billingAddress.city}
                onChange={(event) =>
                  setBillingAddress({ ...billingAddress, city: event.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label htmlFor="billingProvince">Province/State *</label>
              <input
                id="billingProvince"
                type="text"
                required
                className={`field-input${missingFields.includes('billing.province') ? ' is-error' : ''}`}
                value={billingAddress.province}
                onChange={(event) =>
                  setBillingAddress({ ...billingAddress, province: event.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label htmlFor="billingPostalCode">Postal Code *</label>
              <input
                id="billingPostalCode"
                type="text"
                required
                className={`field-input${missingFields.includes('billing.postalCode') ? ' is-error' : ''}`}
                value={billingAddress.postalCode}
                onChange={(event) =>
                  setBillingAddress({ ...billingAddress, postalCode: event.target.value })
                }
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="billingCountry">Country *</label>
            <select
              id="billingCountry"
              required
              className={`field-input${missingFields.includes('billing.country') ? ' is-error' : ''}`}
              value={billingAddress.country}
              onChange={(event) =>
                setBillingAddress({ ...billingAddress, country: event.target.value })
              }
            >
              <option value="CA">Canada</option>
              <option value="US">United States</option>
            </select>
          </div>
        </div>
      )}

      {submitError && <div className="error-message">{submitError}</div>}
      {isCalculatingTotals && <p className="muted">Recalculating totals…</p>}

      <button
        type="submit"
        disabled={!stripe || isSubmitting || isFetchingRates || isCalculatingTotals}
        className="btn-primary"
      >
        {isSubmitting ? 'Processing…' : `Place Order - $${totals.total.toFixed(2)} CAD`}
      </button>

      <style jsx>{`
        .checkout-form {
          display: grid;
          gap: 24px;
          padding: 32px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
        }
        .form-group {
          display: grid;
          gap: 8px;
        }
        .form-row {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }
        .field-input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid #d4d7de;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .field-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
          outline: none;
        }
        .field-input.is-error {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }
        .error-box {
          border-left: 4px solid #ef4444;
          background: rgba(239, 68, 68, 0.08);
          padding: 16px 20px;
          border-radius: 12px;
          color: #991b1b;
          display: grid;
          gap: 8px;
        }
        .error-box ul {
          margin: 0;
          padding-left: 18px;
        }
        .delivery-list {
          display: grid;
          gap: 12px;
        }
        .delivery-option {
          display: flex;
          gap: 16px;
          align-items: center;
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
          transition: border-color 0.2s ease, background 0.2s ease;
          cursor: pointer;
        }
        .delivery-option:hover {
          border-color: #2563eb;
        }
        .delivery-option.is-selected {
          border-color: #2563eb;
          background: rgba(37, 99, 235, 0.08);
        }
        .delivery-option input {
          width: 18px;
          height: 18px;
          accent-color: #2563eb;
        }
        .delivery-option__info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .delivery-option__name {
          font-weight: 600;
          color: #1f2937;
        }
        .delivery-option__meta {
          display: flex;
          gap: 12px;
          font-size: 0.85rem;
          color: #475569;
        }
        .delivery-option__meta strong {
          color: #1f2937;
        }
        .payment-card {
          display: grid;
          gap: 12px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
        }
        .card-element {
          padding: 12px;
          border: 1px solid #d4d7de;
          border-radius: 8px;
          background: #ffffff;
        }
        .checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-size: 0.95rem;
          color: #1f2937;
        }
        .checkbox-label input {
          width: 18px;
          height: 18px;
        }
        .billing-card {
          display: grid;
          gap: 16px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
        }
        .btn-primary {
          background: #ff1f3d;
          color: #ffffff;
          border: none;
          border-radius: 999px;
          padding: 14px 28px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .btn-primary:hover {
          background: #e3002b;
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .text-button {
          background: none;
          border: none;
          color: #2563eb;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
        }
        .text-button:hover {
          text-decoration: underline;
        }
        .muted {
          color: #64748b;
          font-size: 0.9rem;
        }
        .error-message {
          border-left: 4px solid #ef4444;
          background: rgba(239, 68, 68, 0.08);
          padding: 16px 20px;
          border-radius: 12px;
          color: #991b1b;
        }
        @media (max-width: 768px) {
          .checkout-form {
            padding: 24px;
          }
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </form>
  );
}

export default function CheckoutPage() {
  const { cart, isLoading } = useCart();
  const router = useRouter();
  const [checkoutTotals, setCheckoutTotals] = useState<CheckoutTotals>(emptyTotals);

  useEffect(() => {
    if (!isLoading && (!cart || cart.items.length === 0)) {
      router.push('/cart');
    }
  }, [cart, isLoading, router]);

  if (isLoading || !cart || cart.items.length === 0) {
    return <CheckoutSkeleton />;
  }

  return (
    <div className="container">
      <div className="checkout-grid">
        <Elements stripe={stripePromise}>
          <CheckoutForm cart={cart} onTotalsChange={setCheckoutTotals} />
        </Elements>
        <CheckoutSummary cart={cart} totals={checkoutTotals} />
      </div>
    </div>
  );
}
