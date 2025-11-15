/**
 * About Page
 * [2025-11-11 22:30:10] Scaffold
 * [2025-11-12 00:05:20] Ported mission, timeline, and team highlights from legacy static page
 * [2025-01-27 17:10:00] 补充 SEO 元数据
 */
import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';

// [2025-01-27 17:10:00] 生成关于页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'About Us - Custom Merchandise Experts',
  description: 'Suvernire Plus is a team of designers, production experts, and logistics pros helping brands create meaningful custom merchandise. Quality without compromise, on-time delivery.',
  keywords: ['about us', 'custom merchandise', 'custom apparel', 'team', 'company', 'mission'],
  url: 'https://suvernireplus.com/about',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const milestones = [
  { year: '2015', detail: 'Launched Suvernire Plus with a single screen-print press in Toronto.' },
  { year: '2018', detail: 'Introduced full-service Design Lab with remote creative consultations.' },
  { year: '2021', detail: 'Expanded to fulfill North American orders with sustainable materials.' },
  { year: '2024', detail: 'Rolled out enterprise swag programs for distributed teams.' },
];

const values = [
  {
    title: 'People-first support',
    description: 'Our in-house specialists partner with you from mockups to delivery.',
  },
  {
    title: 'Quality without compromise',
    description: 'We source garments and promo products from trusted, ethical suppliers.',
  },
  {
    title: 'On-time, every time',
    description: 'Free standard shipping and rush options keep your events on schedule.',
  },
];

export default function AboutPage() {
  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '32px' }}>
      <header style={{ display: 'grid', gap: '16px', maxWidth: '720px' }}>
        <h1>Built by merch makers who care</h1>
        <p>
          Suvernire Plus is a team of designers, production experts, and logistics pros helping brands create
          meaningful merch. From the first sketch to the final unboxing moment, we obsess over every detail so
          you do not have to.
        </p>
      </header>

      <section style={{ display: 'grid', gap: '20px' }}>
        <h2>What we stand for</h2>
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {values.map((value) => (
            <article key={value.title} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ marginBottom: '8px' }}>{value.title}</h3>
              <p style={{ color: '#6b7280' }}>{value.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', gap: '16px' }}>
        <h2>Milestones</h2>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '12px' }}>
          {milestones.map((milestone) => (
            <li
              key={milestone.year}
              style={{
                borderLeft: '4px solid #ff1f3d',
                paddingLeft: '16px',
                fontSize: '16px',
                color: '#374151',
              }}
            >
              <strong style={{ display: 'block', fontSize: '18px' }}>{milestone.year}</strong>
              {milestone.detail}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ display: 'grid', gap: '12px', maxWidth: '720px' }}>
        <h2>Meet the team</h2>
        <p>
          Designers, project managers, and production leads collaborate under one roof to keep quality high and
          timelines short. Want to work with us? Reach out at <a href="mailto:hello@suvernireplus.com">hello@suvernireplus.com</a>.
        </p>
      </section>
    </section>
  );
}
