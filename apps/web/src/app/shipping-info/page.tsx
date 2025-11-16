/**
 * Shipping Information Page
 * [2025-11-11 22:31:25] Scaffold
 * [2025-11-12 00:06:20] Added delivery timelines and rate overview
 * [2025-01-27 17:40:00] 补充 SEO 元数据
 * [2025-11-16 12:50:00] 对齐原型化运费文案与分区
 */
import Link from 'next/link';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Shipping Information - Delivery Options & Rates',
  description:
    'Shipping options and delivery timelines for Canada and United States. Standard and rush shipping rates. Free shipping available.',
  keywords: ['shipping', 'delivery', 'shipping rates', 'shipping options', 'rush shipping', 'free shipping'],
  url: 'https://suvernireplus.com/shipping-info',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const shippingOptions = [
  {
    title: 'Standard Shipping',
    timeline: '10–14 business days',
    cost: 'FREE over $75 or $9.99',
    blurb: 'Most economical option for non-urgent orders.',
  },
  {
    title: 'Rush Shipping',
    timeline: '3–5 business days',
    cost: '$24.99–$34.99 based on order size',
    blurb: 'Ideal for time-sensitive deliveries across Canada and the U.S.',
  },
  {
    title: 'Express Shipping',
    timeline: '1–2 business days',
    cost: '$44.99–$64.99',
    blurb: 'Fastest option available (limited to U.S. addresses).',
  },
];

const processingTimes = [
  { label: 'Standard items', value: '3–5 business days' },
  { label: 'Complex designs', value: '5–7 business days' },
  { label: 'Bulk orders (25+)', value: '7–10 business days' },
];

const internationalMarkets = ['Canada', 'United Kingdom', 'Australia', 'Germany', 'France'];

export default function ShippingInfoPage() {
  return (
    <section className="policy">
      <div className="policy-hero">
        <div className="container policy-hero__content">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ol>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li aria-current="page">Shipping Information</li>
            </ol>
          </nav>
          <p className="eyebrow">Logistics</p>
          <h1>Shipping Information</h1>
          <p>Fast, reliable delivery for your custom orders.</p>
        </div>
      </div>

      <div className="container policy__content">
        <section className="policy-grid">
          {shippingOptions.map((option) => (
            <article key={option.title} className="policy-card">
              <h2>{option.title}</h2>
              <p>
                <strong>Delivery Time:</strong> {option.timeline}
              </p>
              <p>
                <strong>Cost:</strong> {option.cost}
              </p>
              <p>{option.blurb}</p>
            </article>
          ))}
        </section>

        <section className="policy-card">
          <h2>Processing times</h2>
          <ul>
            {processingTimes.map((item) => (
              <li key={item.label}>
                <strong>{item.label}:</strong> {item.value}
              </li>
            ))}
          </ul>
          <p className="policy-note">Processing begins after design approval and payment confirmation.</p>
        </section>

        <section className="policy-grid two-column">
          <article className="policy-card">
            <h2>Domestic (United States)</h2>
            <p>We ship to all U.S. states via UPS, FedEx, or USPS with tracking at every milestone.</p>
          </article>
          <article className="policy-card">
            <h2>International</h2>
            <p>We currently ship to:</p>
            <ul>
              {internationalMarkets.map((market) => (
                <li key={market}>{market}</li>
              ))}
            </ul>
            <p className="policy-note">International orders may incur customs duties and taxes.</p>
          </article>
        </section>

        <section className="policy-card">
          <h2>Tracking your order</h2>
          <p>Every shipment includes a tracking link. Monitor progress from fulfillment to delivery.</p>
          <Link href="/order-tracking" className="btn btn--outline policy-link">
            Track your order
          </Link>
        </section>

        <section className="policy-card">
          <h2>Shipping updates</h2>
          <p>We&apos;ll notify you when:</p>
          <ul>
            <li>Your order is received</li>
            <li>Production begins</li>
            <li>Your order ships</li>
            <li>Your order is delivered</li>
          </ul>
        </section>

        <section className="policy-card">
          <h2>Free shipping threshold</h2>
          <p className="policy-highlight">Free standard shipping on orders over $75.</p>
          <p>Combine multiple items to qualify automatically.</p>
        </section>

        <section className="policy-card">
          <h2>Delivery issues</h2>
          <p>If your order arrives damaged or incorrect:</p>
          <ul>
            <li>Contact us within 48 hours of delivery</li>
            <li>We&apos;ll replace or refund immediately—no questions asked</li>
            <li>Need more details? <Link href="/returns">Review our return policy</Link></li>
          </ul>
        </section>

        <section className="policy-callout">
          <h2>Questions?</h2>
          <p>Need help with shipping? Our customer team is here for you.</p>
          <div className="policy-contact">
            <div>
              <span>Phone</span>
              <strong>800-293-4232</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>shipping@suvernireplus.com</strong>
            </div>
            <div>
              <span>Hours</span>
              <strong>Mon–Fri 9am–6pm EST</strong>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
