/**
 * Shipping Information Page
 * [2025-11-11 22:31:25] Scaffold
 * [2025-11-12 00:06:20] Added delivery timelines and rate overview
 * [2025-01-27 17:40:00] 补充 SEO 元数据
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// [2025-01-27 17:40:00] 生成配送信息页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Shipping Information - Delivery Options & Rates',
  description: 'Shipping options and delivery timelines for Canada and United States. Standard and rush shipping rates. Free shipping available.',
  keywords: ['shipping', 'delivery', 'shipping rates', 'shipping options', 'rush shipping', 'free shipping'],
  url: 'https://suvernireplus.com/shipping-info',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const shippingTable = [
  { region: 'Canada', service: 'Standard', rate: '$9.99 CAD', timeline: 'Arrives in 7–10 business days' },
  { region: 'Canada', service: 'Rush', rate: '$19.99 CAD', timeline: 'Arrives in 3–5 business days' },
  { region: 'United States', service: 'Standard', rate: '$12.99 CAD', timeline: 'Arrives in 8–12 business days' },
];

export default function ShippingInfoPage() {
  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '28px', maxWidth: '720px' }}>
      <header style={{ display: 'grid', gap: '12px' }}>
        <h1>Shipping Information</h1>
        <p>
          Every order ships with tracking and proactive status updates. Choose the delivery speed that fits your
          event—rush options are available across Canada and the United States.
        </p>
      </header>

      <section style={{ display: 'grid', gap: '12px' }}>
        <h2>Shipping rates</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
            <thead>
              <tr style={{ background: '#f8f8f8' }}>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Region</th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Service</th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Rate</th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Estimated arrival</th>
              </tr>
            </thead>
            <tbody>
              {shippingTable.map((row) => (
                <tr key={`${row.region}-${row.service}`}>
                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{row.region}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{row.service}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{row.rate}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{row.timeline}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ display: 'grid', gap: '12px' }}>
        <h2>Production time</h2>
        <p>
          Most apparel orders ship in 5–7 business days after artwork approval. Promo products and embroidery may
          add 2–3 days. Need a faster turnaround? Contact us—rush production spots open every week.
        </p>
      </section>

      <section style={{ display: 'grid', gap: '12px' }}>
        <h2>International shipping</h2>
        <p>
          We currently fulfill orders across Canada and the United States. For international projects, get in
          touch with our enterprise team to review carrier options and customs requirements.
        </p>
      </section>
    </section>
  );
}
