/**
 * Privacy Policy Page
 * [2025-11-11 22:31:55] Scaffold
 * [2025-11-12 00:07:20] Added data collection, usage, and rights overview
 * [2025-01-27 17:25:00] 补充 SEO 元数据
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// [2025-01-27 17:25:00] 生成隐私政策页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Privacy Policy - Data Protection & Privacy',
  description: 'Learn how Suvernire Plus collects, uses, and protects your personal information. Our commitment to data privacy and your rights.',
  keywords: ['privacy policy', 'data protection', 'privacy', 'data security', 'personal information'],
  url: 'https://suvernireplus.com/privacy-policy',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const sections = [
  {
    title: 'Information we collect',
    body:
      'We collect the information you provide when creating an account, placing an order, or contacting support. This includes contact details, shipping addresses, and artwork files you upload.',
  },
  {
    title: 'How we use your data',
    body:
      'Data is used to process orders, provide support, personalize product recommendations, and improve our services. We do not sell customer information to third parties.',
  },
  {
    title: 'Sharing with partners',
    body:
      'We share necessary data with production facilities, shipping carriers, and payment providers to fulfill orders. Each partner is bound by confidentiality agreements.',
  },
  {
    title: 'Your choices',
    body:
      'You can update account information at any time, request deletion of stored artwork, or opt out of marketing emails. Contact privacy@suvernireplus.com for data access requests.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '28px', maxWidth: '720px' }}>
      <header style={{ display: 'grid', gap: '12px' }}>
        <h1>Privacy Policy</h1>
        <p>
          Your trust matters. This policy explains what data we collect, how it is used, and the controls you have
          over your information when working with Suvernire Plus.
        </p>
      </header>

      {sections.map((section) => (
        <section key={section.title} style={{ display: 'grid', gap: '12px' }}>
          <h2>{section.title}</h2>
          <p>{section.body}</p>
        </section>
      ))}

      <section style={{ display: 'grid', gap: '12px' }}>
        <h2>Security</h2>
        <p>
          We encrypt data in transit, restrict system access to authorized employees, and routinely audit our
          infrastructure. If a security event occurs, we will notify affected users promptly.
        </p>
      </section>

      <section style={{ display: 'grid', gap: '12px' }}>
        <h2>Contact</h2>
        <p>
          Questions? Email <a href="mailto:privacy@suvernireplus.com">privacy@suvernireplus.com</a> or write to
          Suvernire Plus, 250 Front Street W, Suite 1200, Toronto, ON M5V 3G5, Canada.
        </p>
      </section>
    </section>
  );
}
