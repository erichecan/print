/**
 * Returns & Exchanges Page
 * [2025-11-11 22:31:00] Scaffold
 * [2025-11-12 00:06:00] Documented return windows and support flow
 * [2025-01-27 17:35:00] 补充 SEO 元数据
 * [2025-11-16 12:45:00] 对齐原型化排版与内容分区
 */
import Link from 'next/link';
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Returns & Exchanges Policy',
  description: 'Learn about Suvernire Plus return and exchange policy. Custom products return process, timelines, and how to start a return.',
  keywords: ['returns', 'exchanges', 'return policy', 'refund policy', 'custom product returns'],
  url: 'https://suvernireplus.com/returns',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const eligibleItems = ['Standard products with manufacturing defects', 'Incorrect items received', 'Damaged items'];
const ineligibleItems = ['Custom-designed items (unless defective or incorrect)', 'Items worn or used', 'Personalized products', 'Items returned after 30 days'];
const returnProcess = [
  'Contact us at returns@suvernireplus.com or 800-293-4232',
  'Receive a Return Merchandise Authorization (RMA)',
  'Pack items using the original packaging when possible',
  'Ship the package within 7 days using the provided label',
  'Refunds process within 5–10 business days after inspection',
];
const refundTimeline = [
  'Return received: 3–5 business days to log and inspect',
  'Credit/debit refunds: 5–10 business days after approval',
  'PayPal refunds: 3–5 business days after approval',
];
const conditions = ['Be unworn and unused', 'Include original tags', 'Return in original packaging', 'Display the RMA number on the label'];
const exchangeNotes = ['Same item, different size or color', 'Price differences are refunded or invoiced', 'Customer covers outbound exchange shipping'];
const cancellationRules = ['Full refund if production has not started', '50% refund once production begins', 'Standard return policy applies after shipment'];
const contactChannels = [
  { label: 'Phone', value: '800-293-4232' },
  { label: 'Email', value: 'returns@suvernireplus.com' },
  { label: 'Hours', value: 'Mon–Fri 9am–6pm EST' },
];

export default function ReturnsPage() {
  return (
    <section className="policy">
      <div className="policy-hero">
        <div className="container policy-hero__content">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <ol>
              <li>
                <Link href="/">Home</Link>
              </li>
              <li aria-current="page">Returns &amp; Exchanges</li>
            </ol>
          </nav>
          <p className="eyebrow">Support</p>
          <h1>Returns &amp; Refunds</h1>
          <p>Your satisfaction is our priority. Here&apos;s how we make returns easy.</p>
        </div>
      </div>

      <div className="container policy__content">
        <div className="policy-grid">
          <article className="policy-card">
            <h2>100% Satisfaction Guarantee</h2>
            <p>We stand behind every product. If you&apos;re not completely satisfied, we&apos;ll make it right.</p>
          </article>
          <article className="policy-card">
            <h2>Free Return Shipping</h2>
            <p>Defective, damaged, or incorrect items qualify for prepaid return labels.</p>
          </article>
          <article className="policy-card">
            <h2>Fast Reprints</h2>
            <p>Most reprints leave our facility within 48 hours after approval.</p>
          </article>
        </div>

        <section className="policy-card">
          <h2>Eligibility</h2>
          <div className="policy-grid two-column">
            <div>
              <h3>Items we accept</h3>
              <ul>
                {eligibleItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Items we can&apos;t accept</h3>
              <ul>
                {ineligibleItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="policy-card">
          <h2>Return process</h2>
          <ol className="policy-steps">
            {returnProcess.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="policy-grid two-column">
          <article className="policy-card">
            <h2>Refund timeline</h2>
            <ul>
              {refundTimeline.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </article>
          <article className="policy-card">
            <h2>Return conditions</h2>
            <ul>
              {conditions.map((condition) => (
                <li key={condition}>{condition}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="policy-grid two-column">
          <article className="policy-card">
            <h2>Shipping costs</h2>
            <h3>Free Returns</h3>
            <p>We cover shipping for defective, damaged, or incorrect items.</p>
            <h3>Customer Responsibility</h3>
            <p>Size exchanges or change-of-mind returns use your carrier of choice.</p>
          </article>
          <article className="policy-card">
            <h2>Exchanges</h2>
            <ul>
              {exchangeNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="policy-card">
          <h2>Damaged or defective items</h2>
          <p>Received a damaged item? Contact us immediately and we&apos;ll send a replacement at no cost.</p>
          <p>
            <strong>Email:</strong> quality@suvernireplus.com &nbsp;·&nbsp; <strong>Phone:</strong> 800-293-4232
          </p>
        </section>

        <section className="policy-card">
          <h2>Order cancellations</h2>
          <ul>
            {cancellationRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className="policy-callout">
          <h2>Need help?</h2>
          <p>Our customer success team is on standby to assist with returns and exchanges.</p>
          <div className="policy-contact">
            {contactChannels.map((channel) => (
              <div key={channel.label}>
                <span>{channel.label}</span>
                <strong>{channel.value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
