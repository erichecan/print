/**
 * Help Center Page
 * [2025-11-11 22:32:45] Scaffold
 * [2025-11-12 00:06:40] Published quick links and FAQs
 */

import Link from 'next/link';

const quickLinks = [
  { label: 'Check order status', href: '/order-tracking' },
  { label: 'Update shipping address', href: '/contact' },
  { label: 'Launch Design Lab', href: '/design-lab' },
  { label: 'Review return policy', href: '/returns' },
];

const faqItems = [
  {
    question: 'How long does production take?',
    answer: 'Most apparel ships in 5–7 business days after proof approval; rush options are available.',
  },
  {
    question: 'Can you help with logo cleanup?',
    answer: 'Yes! Upload what you have and our design team will polish it for print at no extra cost.',
  },
  {
    question: 'Do you track shipments?',
    answer: 'Every order includes tracking numbers and proactive notifications once your package is in transit.',
  },
];

export default function HelpPage() {
  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '32px' }}>
      <header style={{ display: 'grid', gap: '12px', maxWidth: '720px' }}>
        <h1>Help Center</h1>
        <p>
          Find answers fast or contact our team for hands-on support. Browse FAQs, manage orders, and access
          design resources from one place.
        </p>
      </header>

      <section style={{ display: 'grid', gap: '16px' }}>
        <h2>Quick links</h2>
        <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '16px',
                fontWeight: 600,
                color: '#1f2937',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', gap: '12px', maxWidth: '720px' }}>
        <h2>Top questions</h2>
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
