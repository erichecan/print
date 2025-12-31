/**
 * About Client Component
* Client component for about page that fetches CMS content
 */
'use client';

import useSWR from 'swr';
import { contentApi } from '@/lib/api';

export function AboutClient() {
// 从 CMS 获取关于页内容
  const { data: contentData } = useSWR('public-content-config', contentApi.get);
  const aboutPage = contentData?.data?.aboutPage;

// 使用 CMS 数据或默认值（向后兼容）
  const headerTitle = aboutPage?.headerTitle || 'Built by merch makers who care';
  const headerDescription =
    aboutPage?.headerDescription ||
    'Suvernire Plus is a team of designers, production experts, and logistics pros helping brands create meaningful merch. From the first sketch to the final unboxing moment, we obsess over every detail so you do not have to.';
  const milestones = aboutPage?.milestones || [
    { id: 'default-1', year: '2015', detail: 'Launched Suvernire Plus with a single screen-print press in Toronto.' },
    { id: 'default-2', year: '2018', detail: 'Introduced full-service Design Lab with remote creative consultations.' },
    { id: 'default-3', year: '2021', detail: 'Expanded to fulfill North American orders with sustainable materials.' },
    { id: 'default-4', year: '2024', detail: 'Rolled out enterprise swag programs for distributed teams.' },
  ];
  const values = aboutPage?.values || [
    {
      id: 'default-1',
      title: 'People-first support',
      description: 'Our in-house specialists partner with you from mockups to delivery.',
    },
    {
      id: 'default-2',
      title: 'Quality without compromise',
      description: 'We source garments and promo products from trusted, ethical suppliers.',
    },
    {
      id: 'default-3',
      title: 'On-time, every time',
      description: 'Free standard shipping and rush options keep your events on schedule.',
    },
  ];
  const teamTitle = aboutPage?.teamTitle || 'Meet the team';
  const teamDescription =
    aboutPage?.teamDescription ||
    'Designers, project managers, and production leads collaborate under one roof to keep quality high and timelines short. Want to work with us? Reach out at hello@suvernireplus.com.';

  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '32px' }}>
      <header style={{ display: 'grid', gap: '16px', maxWidth: '720px' }}>
        <h1>{headerTitle}</h1>
        <p>{headerDescription}</p>
      </header>

      <section style={{ display: 'grid', gap: '20px' }}>
        <h2>What we stand for</h2>
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {values.map((value) => (
            <article key={value.id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px' }}>
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
              key={milestone.id}
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
        <h2>{teamTitle}</h2>
        <p dangerouslySetInnerHTML={{ __html: teamDescription.replace(/hello@suvernireplus\.com/g, '<a href="mailto:hello@suvernireplus.com">hello@suvernireplus.com</a>') }} />
      </section>
    </section>
  );
}

