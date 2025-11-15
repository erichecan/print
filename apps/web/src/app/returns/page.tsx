/**
 * Returns & Exchanges Page
 * [2025-11-11 22:31:00] Scaffold
 * [2025-11-12 00:06:00] Documented return windows and support flow
 * [2025-01-27 17:35:00] 补充 SEO 元数据
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// [2025-01-27 17:35:00] 生成退货政策页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Returns & Exchanges Policy',
  description: 'Learn about Suvernire Plus return and exchange policy. Custom products return process, timelines, and how to start a return.',
  keywords: ['returns', 'exchanges', 'return policy', 'refund policy', 'custom product returns'],
  url: 'https://suvernireplus.com/returns',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const faqItems = [
  {
    question: 'What if there is an issue with my order?',
    answer:
      'Let us know within 14 days of delivery. We will reprint, refund, or credit your account to make things right.',
  },
  {
    question: 'Can I return custom products?',
    answer:
      'Because each item is made to order, we only accept returns when the product differs from the approved proof.',
  },
  {
    question: 'How do I start a return?',
    answer:
      'Email support@suvernireplus.com with your order number and photos of the issue. Our team responds within one business day.',
  },
];

export default function ReturnsPage() {
  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '28px', maxWidth: '720px' }}>
      <header style={{ display: 'grid', gap: '12px' }}>
        <h1>Returns &amp; Exchanges</h1>
        <p>
          We stand behind every print. If your order is anything less than perfect, we will replace or refund it
          fast—no hoops to jump through.
        </p>
      </header>

      <section style={{ display: 'grid', gap: '12px' }}>
        <h2>Our promise</h2>
        <p>
          Report any issues within 14 days of delivery. Provide photos and your order number so we can resolve the
          situation quickly. Most reprints leave our facility within 48 hours of approval.
        </p>
      </section>

      <section style={{ display: 'grid', gap: '16px' }}>
        <h2>Return steps</h2>
        <ol style={{ margin: 0, paddingLeft: '20px', color: '#374151', lineHeight: 1.7 }}>
          <li>Contact support with your order number and issue summary.</li>
          <li>Share photos of the product and packing slip so we can verify the error.</li>
          <li>Approve the updated proof or choose a refund option.</li>
          <li>Receive your replacement shipment or refund confirmation.</li>
        </ol>
      </section>

      <section style={{ display: 'grid', gap: '12px' }}>
        <h2>FAQs</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          {faqItems.map((faq) => (
            <article key={faq.question} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
              <h3 style={{ marginBottom: '8px' }}>{faq.question}</h3>
              <p style={{ color: '#6b7280' }}>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
