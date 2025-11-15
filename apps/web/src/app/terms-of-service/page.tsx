/**
 * Terms of Service Page
 * [2025-11-11 22:32:20] Scaffold
 * [2025-11-12 00:07:40] Added core service terms and responsibilities
 * [2025-01-27 17:30:00] 补充 SEO 元数据
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// [2025-01-27 17:30:00] 生成服务条款页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Terms of Service - Usage Terms & Conditions',
  description: 'Read Suvernire Plus terms of service including payment, proof approval, shipping, returns, and customer responsibilities.',
  keywords: ['terms of service', 'terms and conditions', 'service terms', 'legal', 'user agreement'],
  url: 'https://suvernireplus.com/terms-of-service',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const terms = [
  {
    title: 'Using our services',
    body:
      'Suvernire Plus provides custom merchandise production and fulfillment. By placing an order you confirm you have rights to all uploaded artwork.',
  },
  {
    title: 'Payment & billing',
    body:
      'Orders are charged when production begins. All prices are listed in CAD unless stated otherwise. Taxes are calculated based on the ship-to address.',
  },
  {
    title: 'Proof approval',
    body:
      'You must review and approve digital proofs before we print. Approved proofs represent the final design—changes after approval may incur additional costs or delays.',
  },
  {
    title: 'Intellectual property',
    body:
      'You retain ownership of your artwork. By uploading files you grant Suvernire Plus the right to produce merchandise for your order.',
  },
  {
    title: 'Limitation of liability',
    body:
      'Our liability is limited to the amount paid for the order. We are not liable for indirect damages such as lost events or profits.',
  },
];

export default function TermsOfServicePage() {
  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '28px', maxWidth: '720px' }}>
      <header style={{ display: 'grid', gap: '12px' }}>
        <h1>Terms of Service</h1>
        <p>
          These terms outline how Suvernire Plus operates, what you can expect from us, and the responsibilities
          you take on when placing an order.
        </p>
      </header>

      {terms.map((term) => (
        <section key={term.title} style={{ display: 'grid', gap: '12px' }}>
          <h2>{term.title}</h2>
          <p>{term.body}</p>
        </section>
      ))}

      <section style={{ display: 'grid', gap: '12px' }}>
        <h2>Contact</h2>
        <p>
          Questions about these terms? Email <a href="mailto:legal@suvernireplus.com">legal@suvernireplus.com</a>.
        </p>
      </section>
    </section>
  );
}
