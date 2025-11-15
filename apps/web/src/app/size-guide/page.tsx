/**
 * Size Guide Page
 * [2025-11-11 22:33:10] Scaffold
 * [2025-11-12 00:07:00] Added measurement instructions and core size charts
 * [2025-01-27 17:45:00] 补充 SEO 元数据
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// [2025-01-27 17:45:00] 生成尺码指南页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Size Guide - Clothing Size Charts & Measurements',
  description: 'Find the perfect fit with our size guide. Measurement instructions and size charts for t-shirts, hoodies, and apparel.',
  keywords: ['size guide', 'size chart', 'measurements', 'clothing sizes', 'fit guide', 'sizing'],
  url: 'https://suvernireplus.com/size-guide',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const sizeRows = [
  { size: 'XS', chest: '32-34"', length: '26"' },
  { size: 'S', chest: '35-37"', length: '27"' },
  { size: 'M', chest: '38-40"', length: '28"' },
  { size: 'L', chest: '41-43"', length: '29"' },
  { size: 'XL', chest: '44-46"', length: '30"' },
  { size: '2XL', chest: '47-49"', length: '31"' },
];

export default function SizeGuidePage() {
  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '28px', maxWidth: '720px' }}>
      <header style={{ display: 'grid', gap: '12px' }}>
        <h1>Size Guide</h1>
        <p>
          Use these measurements to pick the best fit. Measurements are in inches and taken from finished
          garments laid flat. Need spec sheets for a specific brand? Contact support and we will send them over.
        </p>
      </header>

      <section style={{ display: 'grid', gap: '12px' }}>
        <h2>Unisex tees</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '420px' }}>
            <thead>
              <tr style={{ background: '#f8f8f8' }}>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Size</th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Chest</th>
                <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e5e7eb' }}>Body length</th>
              </tr>
            </thead>
            <tbody>
              {sizeRows.map((row) => (
                <tr key={row.size}>
                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{row.size}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{row.chest}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>{row.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ display: 'grid', gap: '12px' }}>
        <h2>How to measure</h2>
        <ol style={{ margin: 0, paddingLeft: '20px', color: '#374151', lineHeight: 1.7 }}>
          <li>Lay a similar garment flat on a table.</li>
          <li>Measure 1&quot; below the armhole from edge to edge for chest width, then double the number. {/* [2025-11-11 06:06:27] 转义双引号避免 ESLint 警告 */}</li>
          <li>Measure from the highest point on the shoulder to the bottom hem for body length.</li>
        </ol>
      </section>

      <section style={{ display: 'grid', gap: '12px' }}>
        <h2>Fit tips</h2>
        <p>
          For a relaxed fit, choose one size up from your normal size. Women often prefer one size down in unisex
          garments. When in doubt, we recommend ordering a sizing kit before placing your final order.
        </p>
      </section>
    </section>
  );
}
