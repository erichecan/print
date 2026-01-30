/**
 * Checkout Page
* Checkout UX 改造：费用预估、地址持久化、结果页提示
 */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
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
  couponApi,
  authApi,
  paymentMethodsApi,
  PaymentMethod,
} from '@/lib/api';
import { validateAddressForm, formatCanadianPostalCode, formatPhoneNumber } from '@/utils/validation';
import { useToast } from '@/hooks/useToast'; // Toast 通知
import { mapStripeError } from '@/utils/stripeErrorMapping'; // Stripe error mapping
import { getStripe, isStripeConfigured } from '@/lib/stripe'; // 使用统一的 Stripe 初始化

// 使用统一的 Stripe 初始化，确保 key 正确配置
// 修复：使用统一的 Stripe 初始化函数，避免配置错误
const stripePromise = isStripeConfigured() ? getStripe() : Promise.resolve(null);

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
  promotionDiscount?: number; // 促销折扣
  discount?: number; // 总折扣（促销+优惠券）
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
  discount: 0, // 添加折扣字段
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
}); // 统一转换地址数据发送给后端

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
  appliedCoupon,
}: {
  cart: CartResponse;
  totals: CheckoutTotals;
  appliedCoupon?: { code: string; discountAmount: number; id?: string } | null; // 已应用的优惠券 添加 id 字段
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
        {/* 显示促销折扣 */}
        {totals.promotionDiscount && totals.promotionDiscount > 0 && (
          <div className="summary-row discount" style={{ color: '#e74c3c' }}>
            <span>Promotion Discount</span>
            <span>-${totals.promotionDiscount.toFixed(2)}</span>
          </div>
        )}
        {/* 显示优惠券折扣 */}
        {appliedCoupon && (
          <div className="summary-row discount">
            <span>Discount ({appliedCoupon.code})</span>
            <span>-${appliedCoupon.discountAmount.toFixed(2)}</span>
          </div>
        )}
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

    </aside>
  );
}

function CheckoutForm({
  cart,
  onTotalsChange,
  onCouponChange, // 传递优惠券状态给父组件
}: {
  cart: CartResponse;
  onTotalsChange: (totals: CheckoutTotals) => void;
  onCouponChange?: (coupon: { code: string; discountAmount: number; id?: string } | null) => void; //  添加 id 字段
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { error: showError, warning: showWarning } = useToast(); // Toast 通知

  // 修复TDZ错误：将cardComplete定义移到useEffect之前
  const [cardComplete, setCardComplete] = useState(false);

  // 调试日志：监控 Stripe 加载状态
  // 增强 Stripe 加载状态监控
  // 使用统一的 Stripe 配置获取函数
  // 修复TDZ错误：将useEffect移到cardComplete定义之后
  useEffect(() => {
    try {
      // 使用统一的 Stripe 配置检查
      const stripeKey = isStripeConfigured() ? 'configured' : 'not-configured';
      console.log('[Checkout Debug] Stripe state:', JSON.stringify({
        stripe: stripe ? 'loaded' : 'not-loaded',
        hasStripeKey: !!stripeKey && stripeKey.trim() !== '',
        stripeKeyLength: stripeKey?.length || 0,
        stripeKeyPrefix: stripeKey?.substring(0, 7) || 'none',
        elements: elements ? 'loaded' : 'not-loaded',
        cardComplete,
      }, null, 2));
    } catch (e) {
      // 如果日志输出失败，静默忽略
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Checkout Debug] Failed to log Stripe state:', e);
      }
    }
  }, [stripe, elements, cardComplete]);

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
  const [cardError, setCardError] = useState<string | null>(null);
  // cardComplete已移到组件顶部，避免TDZ错误
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'confirming'>('form');
  // Saved payment methods for quick checkout (Issue #112)
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null); // 'new' or payment method ID
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 优惠券状态
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number; id?: string } | null>(null); // 添加 id 字段
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // 地址持久化：从 localStorage 加载保存的地址
  useEffect(() => {
    try {
      const savedAddress = localStorage.getItem('checkout_shipping_address');
      if (savedAddress) {
        const parsed = JSON.parse(savedAddress) as Partial<ShippingAddressForm>;
        setAddress((prev) => ({ ...prev, ...parsed }));
      }
      const savedBillingSame = localStorage.getItem('checkout_same_billing');
      if (savedBillingSame !== null) {
        setSameBilling(savedBillingSame === 'true');
      }
    } catch (err) {
      console.error(' Failed to load saved address:', err);
    }
  }, []);

  // Load saved payment methods for logged-in users (Issue #112)
  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const user = await authApi.me();
        if (user) {
          setIsLoggedIn(true);
          const methods = await paymentMethodsApi.list();
          setSavedPaymentMethods(methods.paymentMethods);
          // Set default payment method if available
          const defaultMethod = methods.paymentMethods.find((m) => m.isDefault);
          if (defaultMethod) {
            setSelectedPaymentMethod(defaultMethod.id);
          } else if (methods.paymentMethods.length > 0) {
            setSelectedPaymentMethod(methods.paymentMethods[0].id);
          } else {
            setSelectedPaymentMethod('new');
          }
        } else {
          setIsLoggedIn(false);
          setSelectedPaymentMethod('new');
        }
      } catch (err) {
        // User not logged in or error loading payment methods
        setIsLoggedIn(false);
        setSelectedPaymentMethod('new');
      }
    };

    loadPaymentMethods();
  }, []);

  // 地址持久化：自动保存地址到 localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('checkout_shipping_address', JSON.stringify(address));
        localStorage.setItem('checkout_same_billing', String(sameBilling));
      } catch (err) {
        console.error(' Failed to save address:', err);
      }
    }, 500); // 防抖：500ms 后保存

    return () => clearTimeout(timer);
  }, [address, sameBilling]);

  // 调试日志：监听地址状态变化
  useEffect(() => {
    console.log('[Checkout Debug] Address state changed:', JSON.stringify(address, null, 2));
  }, [address]);

  const addressReady = useMemo(() => {
    const ready = (
      address.fullName.trim().length > 0 &&
      address.email.trim().length > 0 &&
      address.phone.trim().length > 0 &&
      address.addressLine1.trim().length > 0 &&
      address.city.trim().length > 0 &&
      address.province.trim().length > 0 &&
      address.postalCode.trim().length > 0 &&
      address.country.trim().length > 0
    );
    // 调试日志：记录 addressReady 状态
    const addressFields = {
      fullName: address.fullName.trim().length > 0,
      email: address.email.trim().length > 0,
      phone: address.phone.trim().length > 0,
      addressLine1: address.addressLine1.trim().length > 0,
      city: address.city.trim().length > 0,
      province: address.province.trim().length > 0,
      postalCode: address.postalCode.trim().length > 0,
      country: address.country.trim().length > 0,
    };
    console.log('[Checkout Debug] addressReady:', ready, JSON.stringify(addressFields, null, 2));
    return ready;
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

  // 应用优惠券
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !addressReady) return;

    setApplyingCoupon(true);
    setCouponError(null);

    try {
      const subtotalForCoupon = totals.subtotal || cart.subtotal;
      const result: any = await couponApi.validate(couponCode.trim().toUpperCase(), subtotalForCoupon);

      const discountAmount = result.coupon.discountAmount;
      const applied = {
        code: result.coupon.code,
        discountAmount,
      };
      setAppliedCoupon(applied);
      setCouponCode('');
      onCouponChange?.(applied); // 通知父组件

      // 更新总计以包含折扣
      const newTotal = Math.max(0, totals.total - discountAmount);
      notifyTotals({
        ...totals,
        discount: discountAmount,
        total: newTotal,
      });
    } catch (err: any) {
      setCouponError(err.message || 'Invalid coupon code');
      setAppliedCoupon(null);
    } finally {
      setApplyingCoupon(false);
    }
  };

  // 移除优惠券
  const handleRemoveCoupon = () => {
    const discountToRemove = appliedCoupon?.discountAmount || 0;
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
    onCouponChange?.(null); // 通知父组件

    // 重新计算总计（移除折扣）
    if (addressReady) {
      // 调用 prepare API 获取不包含折扣的完整费用明细
      checkoutApi
        .prepare({
          shippingAddress: mapAddressForApi(address),
          shippingMethod: selectedShipping,
        })
        .then((prepared: any) => {
          notifyTotals({
            subtotal: prepared.subtotal ?? totals.subtotal,
            discount: 0,
            shipping: prepared.shipping ?? totals.shipping,
            tax: prepared.tax ?? totals.tax,
            total: prepared.total ?? totals.total,
          });
        })
        .catch(() => {
          // 如果 prepare 失败，使用本地计算
          const newTotal = totals.total + discountToRemove;
          notifyTotals({
            ...totals,
            discount: 0,
            total: newTotal,
          });
        });
    } else {
      // 如果地址未准备好，使用本地计算
      const newTotal = totals.total + discountToRemove;
      notifyTotals({
        ...totals,
        discount: 0,
        total: newTotal,
      });
    }
  };

  const refreshTotals = useCallback(
    async (shippingMethod: string) => {
      if (!addressReady) return;
      setIsCalculatingTotals(true);
      setRatesError(null);
      try {
        // 传递优惠券代码到 prepare API
        const result: any = await checkoutApi.prepare({
          shippingAddress: mapAddressForApi(address),
          shippingMethod,
          ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
        });

        // 使用 prepare API 返回的折扣（如果提供了优惠券代码）
        notifyTotals({
          subtotal: result.subtotal ?? cart.subtotal,
          discount: result.discount ?? 0, // 使用 API 返回的折扣
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
    [address, addressReady, cart.subtotal, notifyTotals, appliedCoupon]
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
      }, cart.items);
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

  // 调试日志：输出按钮状态（状态变化时）
  useEffect(() => {
    // 改进 Place Order 按钮禁用条件，包括地址和运费验证
    const placeOrderDisabled = !stripe || isSubmitting || isFetchingRates || isCalculatingTotals || !cardComplete || !addressReady || !selectedShipping || shippingRates.length === 0;
    const applyCouponDisabled = applyingCoupon || !couponCode.trim() || !addressReady;

    const debugInfo = {
      placeOrder: {
        disabled: placeOrderDisabled,
        stripe: !!stripe,
        stripeObject: stripe ? 'loaded' : 'not-loaded',
        isSubmitting,
        isFetchingRates,
        isCalculatingTotals,
        cardComplete,
        addressReady,
        selectedShipping: selectedShipping || 'none',
        shippingRatesCount: shippingRates.length,
        disabledReason: !stripe ? 'no-stripe' :
          isSubmitting ? 'submitting' :
            isFetchingRates ? 'fetching-rates' :
              isCalculatingTotals ? 'calculating-totals' :
                !addressReady ? 'address-not-ready' :
                  shippingRates.length === 0 ? 'no-shipping-rates' :
                    !selectedShipping ? 'no-shipping-selected' :
                      !cardComplete ? 'card-incomplete' : 'enabled'
      },
      applyCoupon: {
        disabled: applyCouponDisabled,
        applyingCoupon,
        hasCouponCode: !!couponCode.trim(),
        couponCodeLength: couponCode.trim().length,
        addressReady,
        disabledReason: applyingCoupon ? 'applying' :
          !couponCode.trim() ? 'no-code' :
            !addressReady ? 'address-not-ready' : 'enabled'
      },
    };

    // 使用 JSON.stringify 确保对象内容可见
    console.log('[Checkout Debug] Button states:', JSON.stringify(debugInfo, null, 2));
  }, [stripe, isSubmitting, isFetchingRates, isCalculatingTotals, cardComplete, addressReady, selectedShipping, shippingRates.length, applyingCoupon, couponCode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    // 使用统一的验证函数
    const addressValidation = validateAddressForm(address);
    const validationErrors: string[] = [...addressValidation.errors];
    const missing: string[] = [];

    // 标记缺失的字段
    if (!address.fullName.trim()) missing.push('shipping.fullName');
    if (!address.email.trim()) missing.push('shipping.email');
    if (!address.phone.trim()) missing.push('shipping.phone');
    if (!address.addressLine1.trim()) missing.push('shipping.addressLine1');
    if (!address.city.trim()) missing.push('shipping.city');
    if (!address.province.trim()) missing.push('shipping.province');
    if (!address.postalCode.trim()) missing.push('shipping.postalCode');
    if (!address.country.trim()) missing.push('shipping.country');

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
      const errorMsg = 'Please correct the highlighted fields before continuing.';
      setSubmitError(errorMsg);
      showError(errorMsg); // 显示 Toast 通知
      return;
    }

    setFormErrors([]);
    setMissingFields([]);
    setSubmitError(null);
    setIsSubmitting(true);
    setPaymentStep('processing');

    // Validate payment method selection (Issue #112)
    if (selectedPaymentMethod === 'new' && !cardComplete) {
      const errorMsg = 'Please complete your card details';
      setCardError(errorMsg);
      setIsSubmitting(false);
      setPaymentStep('form');
      showError(errorMsg); // 显示 Toast 通知
      return;
    }

    if (!selectedPaymentMethod) {
      const errorMsg = 'Please select a payment method';
      setIsSubmitting(false);
      setPaymentStep('form');
      showError(errorMsg);
      return;
    }

    try {
      const shippingPayload = mapAddressForApi(address);
      const billingPayload = sameBilling ? shippingPayload : mapAddressForApi(billingAddress);

      // 传递优惠券信息到 createPaymentIntent
      // Enhanced: Pass amount for validation, customerEmail, metadata
      const paymentIntentResponse = await checkoutApi.createPaymentIntent(
        shippingPayload,
        selectedShipping,
        appliedCoupon?.code,
        appliedCoupon?.id, // 如果前端有存储 couponId，可以传递
        undefined, // draftOrderId (not used currently)
        totals.total, // amount for validation
        'CAD', // currency
        shippingPayload.email, // customerEmail
        {} // metadata
      );

      // 更新优惠券状态（如果 paymentIntentResponse 包含优惠券信息）
      if (paymentIntentResponse.coupon && appliedCoupon) {
        setAppliedCoupon({
          ...appliedCoupon,
          id: paymentIntentResponse.coupon.id,
        });
      }

      if (paymentIntentResponse.breakdown) {
        notifyTotals(paymentIntentResponse.breakdown);
      }

      setPaymentStep('confirming');

      // Use confirmPayment with return_url and receipt_email
      // Use saved payment method or new card (Issue #112)
      let paymentIntent;
      let stripeError = null;

      // Build return URL for 3D Secure and other redirects
      const returnUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/checkout/success?payment_intent=${paymentIntentResponse.paymentIntentId}`
        : '/checkout/success';

      if (selectedPaymentMethod && selectedPaymentMethod !== 'new') {
        // Use saved payment method
        const savedMethod = savedPaymentMethods.find((m) => m.id === selectedPaymentMethod);
        if (!savedMethod) {
          throw new Error('Selected payment method not found');
        }

        // Use confirmCardPayment for saved payment methods
        // Note: receipt_email is set when creating PaymentIntent, return_url not supported by confirmCardPayment
        const { error, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(
          paymentIntentResponse.clientSecret,
          {
            payment_method: savedMethod.stripePaymentMethodId,
          }
        );

        stripeError = error;
        paymentIntent = confirmedIntent;
      } else {
        // Use new card with CardElement
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Payment form is not ready. Please reload and try again.');
        }

        // Use confirmCardPayment with CardElement
        // Note: receipt_email is set when creating PaymentIntent (backend)
        // For 3D Secure, Stripe will handle redirects automatically
        const { error, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(
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

        stripeError = error;
        paymentIntent = confirmedIntent;

        // Save payment method if requested
        if (savePaymentMethod && paymentIntent?.payment_method) {
          try {
            const paymentMethodId = typeof paymentIntent.payment_method === 'string'
              ? paymentIntent.payment_method
              : (paymentIntent.payment_method as any).id;

            if (paymentMethodId) {
              await paymentMethodsApi.save(paymentMethodId, {
                isDefault: savedPaymentMethods.length === 0, // Set as default if first payment method
                billingDetails: {
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
              });
            }
          } catch (err) {
            // Log error but don't fail the order
            console.error('Failed to save payment method:', err);
          }
        }
      }

      // Handle payment result - check for redirect
      // Note: With confirmCardPayment, 3D Secure is handled automatically
      // If status is requires_action, Stripe Elements will show the authentication modal
      // We don't need to handle redirects manually with confirmCardPayment

      if (stripeError) {
        // Use error mapping for user-friendly messages
        const errorMapping = mapStripeError(stripeError);
        setSubmitError(errorMapping.userMessage);
        setCardError(errorMapping.userMessage);
        setPaymentStep('form');
        showError(errorMapping.userMessage); // 显示 Toast 通知

        // Log error details for debugging
        console.error('[Payment Error]', {
          message: errorMapping.message,
          userMessage: errorMapping.userMessage,
          errorCode: errorMapping.errorCode,
          canRetry: errorMapping.canRetry,
          originalError: stripeError,
        });

        return; // 不跳转，让用户有机会重试
      }

      if (paymentIntent?.status !== 'succeeded') {
        const errorMsg = 'Payment was not completed. Please verify details and retry.';
        setSubmitError(errorMsg);
        setPaymentStep('form');
        showError(errorMsg); // 显示 Toast 通知
        return; // 不跳转，让用户有机会重试
      }

      // 传递优惠券信息到 confirm API
      const order = await checkoutApi.confirm(
        paymentIntentResponse.paymentIntentId,
        shippingPayload,
        billingPayload,
        selectedShipping,
        shippingPayload.email,
        appliedCoupon?.code,
        appliedCoupon?.id || paymentIntentResponse.coupon?.id // 优先使用 appliedCoupon 的 id
      );

      // 支付成功后清除保存的地址信息
      try {
        localStorage.removeItem('checkout_shipping_address');
        localStorage.removeItem('checkout_same_billing');
      } catch (err) {
        console.error(' Failed to clear saved address:', err);
      }

      router.push(
        `/checkout/success?orderNumber=${encodeURIComponent(
          order.orderNumber
        )}&email=${encodeURIComponent(shippingPayload.email)}`
      );
    } catch (error: unknown) {
      // 统一错误处理：区分可重试错误和不可重试错误
      const message =
        error instanceof Error
          ? error.message
          : 'Payment failed. Please try again later.';

      // 如果是网络错误或服务器错误，允许重试
      if (error instanceof Error && (error.message.includes('network') || error.message.includes('timeout'))) {
        setSubmitError(`${message} Please try again.`);
      } else {
        // 其他错误也显示在页面上，让用户有机会重试
        setSubmitError(message);
      }
      setPaymentStep('form');
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
          placeholder="(123) 456-7890"
          className={`field-input${missingFields.includes('shipping.phone') ? ' is-error' : ''}`}
          value={address.phone}
          onChange={(event) => {
            let value = event.target.value;
            // 自动格式化电话号码（可选，用户输入时保持灵活）
            // 只在失去焦点时格式化
            setAddress({ ...address, phone: value });
          }}
          onBlur={(event) => {
            // 失去焦点时格式化电话号码
            const formatted = formatPhoneNumber(event.target.value);
            if (formatted !== event.target.value) {
              setAddress({ ...address, phone: formatted });
            }
          }}
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
            onChange={(event) => {
              let value = event.target.value;
              // 自动格式化加拿大邮政编码
              if (address.country === 'CA') {
                value = formatCanadianPostalCode(value);
              }
              setAddress({ ...address, postalCode: value });
            }}
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
      {/* Saved payment methods for quick checkout (Issue #112) */}
      {isLoggedIn && savedPaymentMethods.length > 0 && (
        <div className="payment-card">
          <label>Saved Payment Methods</label>
          <div className="saved-payment-methods">
            {savedPaymentMethods.map((method) => (
              <label
                key={method.id}
                className={`saved-payment-method${selectedPaymentMethod === method.id ? ' is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={selectedPaymentMethod === method.id}
                  onChange={() => setSelectedPaymentMethod(method.id)}
                />
                <div className="saved-payment-method__info">
                  <span className="saved-payment-method__brand">
                    {method.cardBrand ? method.cardBrand.toUpperCase() : 'Card'}
                  </span>
                  <span className="saved-payment-method__last4">
                    •••• {method.cardLast4 || '****'}
                  </span>
                  {method.cardExpMonth && method.cardExpYear && (
                    <span className="saved-payment-method__exp">
                      Exp. {method.cardExpMonth}/{method.cardExpYear}
                    </span>
                  )}
                  {method.isDefault && (
                    <span className="saved-payment-method__default">Default</span>
                  )}
                </div>
              </label>
            ))}
            <label
              className={`saved-payment-method${selectedPaymentMethod === 'new' ? ' is-selected' : ''}`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="new"
                checked={selectedPaymentMethod === 'new'}
                onChange={() => setSelectedPaymentMethod('new')}
              />
              <div className="saved-payment-method__info">
                <span>Use a new card</span>
              </div>
            </label>
          </div>
        </div>
      )}
      {selectedPaymentMethod === 'new' && (
        <div className="payment-card">
          <label htmlFor="card-element">Card Details *</label>
          <div
            id="card-element"
            className={`card-element${cardError ? ' is-error' : ''}${cardComplete ? ' is-complete' : ''}`}
          >
            <CardElement
              options={{
                hidePostalCode: true,
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#1f2937',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    '::placeholder': {
                      color: '#94a3b8',
                    },
                  },
                  invalid: {
                    color: '#ef4444',
                    iconColor: '#ef4444',
                  },
                },
              }}
              onChange={(event) => {
                // 实时监听卡片输入状态
                // 改进卡片状态检测，确保 cardComplete 正确更新
                if (event.error) {
                  setCardError(event.error.message);
                  setCardComplete(false);
                } else {
                  setCardError(null);
                  // 确保 cardComplete 状态正确更新
                  // event.complete 为 true 表示所有必填字段都已填写且有效
                  const isComplete = event.complete === true && !event.empty;
                  setCardComplete(isComplete);
                }
                // 调试日志：记录卡片状态变化
                const cardState = {
                  complete: event.complete,
                  error: event.error?.message || null,
                  empty: event.empty,
                  brand: event.brand || 'unknown',
                  cardComplete: event.complete === true && !event.empty
                };
                console.log('[Checkout Debug] Card state changed:', JSON.stringify(cardState, null, 2));
              }}
            />
          </div>
          {cardError && (
            <p className="card-error-message">{cardError}</p>
          )}
          {cardComplete && !cardError && (
            <p className="card-success-message">✓ Card details are valid</p>
          )}
        </div>
      )}

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

      {/* 优惠券输入 */}
      <h2>Coupon Code</h2>
      <div className="coupon-section">
        {appliedCoupon ? (
          <div className="coupon-applied">
            <div className="coupon-info">
              <strong>Coupon: {appliedCoupon.code}</strong>
              <span>-${appliedCoupon.discountAmount.toFixed(2)}</span>
            </div>
            <button type="button" onClick={handleRemoveCoupon} className="remove-coupon-btn">
              Remove
            </button>
          </div>
        ) : (
          <div className="coupon-input-group">
            <input
              type="text"
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
              className="coupon-input"
              disabled={applyingCoupon || !addressReady}
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={applyingCoupon || !couponCode.trim() || !addressReady}
              className="coupon-apply-btn"
            >
              {applyingCoupon ? '...' : 'Apply'}
            </button>
          </div>
        )}
        {couponError && (
          <div className="coupon-error-message">{couponError}</div>
        )}
      </div>

      {submitError && (
        <div className="error-message">
          <p>{submitError}</p>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setSubmitError(null);
              // 滚动到支付表单
              const cardElement = document.getElementById('card-element');
              if (cardElement) {
                cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          >
            Dismiss and try again
          </button>
        </div>
      )}
      {isCalculatingTotals && <p className="muted">Recalculating totals…</p>}

      <div className="payment-progress">
        {paymentStep === 'processing' && (
          <div className="progress-step">
            <span className="progress-icon">⏳</span>
            <span>Creating payment intent...</span>
          </div>
        )}
        {paymentStep === 'confirming' && (
          <div className="progress-step">
            <span className="progress-icon">💳</span>
            <span>Confirming payment with your bank...</span>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!stripe || isSubmitting || isFetchingRates || isCalculatingTotals || !cardComplete || !addressReady || !selectedShipping || shippingRates.length === 0}
        className="btn-primary"
        title={
          !stripe ? 'Stripe is loading...' :
            isSubmitting ? 'Submitting order...' :
              isFetchingRates ? 'Loading shipping rates...' :
                isCalculatingTotals ? 'Calculating totals...' :
                  !addressReady ? 'Please complete shipping address' :
                    !selectedShipping || shippingRates.length === 0 ? 'Please select a shipping method' :
                      !cardComplete ? 'Please complete card details' :
                        undefined
        }
      >
        {isSubmitting ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="spinner" />
            {paymentStep === 'processing' && 'Processing payment…'}
            {paymentStep === 'confirming' && 'Confirming with bank…'}
          </span>
        ) : (
          `Place Order - $${totals.total.toFixed(2)} CAD`
        )}
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
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .card-element:focus-within {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }
        .card-element.is-error {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
        }
        .card-element.is-complete:not(.is-error) {
          border-color: #10b981;
        }
        .card-error-message {
          margin: 8px 0 0 0;
          font-size: 0.875rem;
          color: #ef4444;
        }
        .card-success-message {
          margin: 8px 0 0 0;
          font-size: 0.875rem;
          color: #10b981;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .payment-progress {
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .progress-step {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: #475569;
        }
        .progress-icon {
          font-size: 1rem;
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
          display: grid;
          gap: 12px;
        }
        .error-message p {
          margin: 0;
        }
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
/* 优惠券样式 */
        .coupon-section {
          display: grid;
          gap: 12px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
        }
        .coupon-input-group {
          display: flex;
          gap: 8px;
        }
        .coupon-input {
          flex: 1;
          padding: 12px 14px;
          border: 1px solid #d4d7de;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .coupon-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
          outline: none;
        }
        .coupon-input:disabled {
          background: #f1f5f9;
          cursor: not-allowed;
        }
        .coupon-apply-btn {
          padding: 12px 20px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .coupon-apply-btn:hover:not(:disabled) {
          background: #1e40af;
        }
        .coupon-apply-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .coupon-applied {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #e8f5e9;
          border-radius: 8px;
          border: 1px solid #81c784;
        }
        .coupon-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex: 1;
          gap: 12px;
        }
        .coupon-info strong {
          color: #2e7d32;
        }
        .coupon-info span {
          color: #2e7d32;
          font-weight: 600;
          font-size: 1.1rem;
        }
        .remove-coupon-btn {
          padding: 8px 16px;
          background: transparent;
          border: 1px solid #2e7d32;
          color: #2e7d32;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .remove-coupon-btn:hover {
          background: #2e7d32;
          color: white;
        }
        .coupon-error-message {
          margin-top: 8px;
          padding: 12px;
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 6px;
          color: #c33;
          font-size: 0.875rem;
        }
        .summary-row.discount {
          color: #2e7d32;
          font-weight: 600;
        }
        @media (max-width: 768px) {
          .checkout-form {
            padding: 24px;
          }
          .form-row {
            grid-template-columns: 1fr;
          }
          .coupon-input-group {
            flex-direction: column;
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
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number; id?: string } | null>(null); //  添加 id 字段
  const [appliedPromotions, setAppliedPromotions] = useState<Array<{ promotionId: string; promotionTitle: string; productId: string; discountAmount: number }>>([]); // 应用的促销活动

  // Debug: Disable auto-redirect to diagnose "Checkout shows empty" issue
  // useEffect(() => {
  //   if (!isLoading && (!cart || cart.items.length === 0)) {
  //     router.push('/cart');
  //   }
  // }, [cart, isLoading, router]);

  // 初始化时获取促销活动信息
  useEffect(() => {
    if (cart && cart.items.length > 0) {
      // 通过 prepareCheckout 获取促销信息（在 CheckoutForm 中处理）
    }
  }, [cart]);

  if (isLoading) {
    return <CheckoutSkeleton />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h1>Checkout</h1>
        <div style={{ margin: '2rem 0', padding: '2rem', background: '#f9fafb', borderRadius: '8px' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Your cart appears to be empty.</p>
          <p style={{ color: '#666', marginBottom: '2rem' }}>This might be due to a session timeout or synchronization issue.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Refresh Page
            </button>
            <Link
              href="/cart"
              style={{
                padding: '0.75rem 1.5rem',
                background: 'white',
                color: '#2563eb',
                border: '1px solid #2563eb',
                borderRadius: '6px',
                textDecoration: 'none'
              }}
            >
              Return to Cart
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="checkout">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/cart">Cart</Link>
            </li>
            <li aria-current="page">Checkout</li>
          </ol>
        </nav>
        <div className="checkout__grid">
          <Elements stripe={stripePromise}>
            <CheckoutForm
              cart={cart}
              onTotalsChange={setCheckoutTotals}
              onCouponChange={setAppliedCoupon} // 接收优惠券状态
            />
          </Elements>
          <CheckoutSummary
            cart={cart}
            totals={checkoutTotals}
            appliedCoupon={appliedCoupon} // 传递优惠券状态
          />
        </div>
      </div>
    </section>
  );
}
