/**
 * Size Guide Page
 * [2025-11-11 22:33:10] Scaffold
 * [2025-11-12 00:07:00] Added measurement instructions and core size charts
 * [2025-01-27 17:45:00] 补充 SEO 元数据
 * [2025-11-16 12:55:00] 使用统一 policy 布局展示尺码信息
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

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

const measurementSteps = [
  'Lay a similar garment flat on a table.',
  'Measure 1" below the armhole from edge to edge for chest width, then double the number.',
  'Measure from the highest point on the shoulder to the hem for body length.',
];

const fitTips = [
  'For a relaxed fit, choose one size up from your normal size.',
  'Women often prefer one size down in unisex garments.',
  'Ordering a sizing kit ensures best results for bulk programs.',
];

export default function SizeGuidePage() {
  return (
    <section className="policy">
      <div className="policy-hero">
        <div className="container policy-hero__content">
          <h1>Size Guide</h1>
          <p>Use these measurements to pick the best fit for your team.</p>
        </div>
      </div>

      <div className="container policy__content">
        <section className="policy-card">
          <h2>Unisex tees</h2>
          <div className="table-scroll">
            <table className="policy-table">
              <thead>
                <tr>
                  <th>Size</th>
                  <th>Chest</th>
                  <th>Body length</th>
                </tr>
              </thead>
              <tbody>
                {sizeRows.map((row) => (
                  <tr key={row.size}>
                    <td>{row.size}</td>
                    <td>{row.chest}</td>
                    <td>{row.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="policy-card">
          <h2>How to measure</h2>
          <ol className="policy-steps">
            {measurementSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="policy-card">
          <h2>Fit tips</h2>
          <ul>
            {fitTips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
