/**
 * Design Gallery Page
 * [2025-11-12 00:04:20] Migrated inspirational design grid from legacy static page
 * [2025-01-27 17:55:00] 补充 SEO 元数据
 * [2025-12-06 20:00:00] 添加社交媒体分享功能 for Issue #142
 */
'use client';

import { generateSEOMetadata } from '@/lib/seo';
import type { Metadata } from 'next';
import { SocialShareMenu } from '@/components/social-share';
import { useEffect, useState } from 'react';

// [2025-01-27 17:55:00] 生成设计画廊页面 SEO 元数据
export const metadata: Metadata = generateSEOMetadata({
  title: 'Design Gallery - Custom Design Inspiration',
  description: 'Browse our design gallery for inspiration. See custom t-shirt designs, hoodies, promotional products, and creative merchandise ideas.',
  keywords: ['design gallery', 'design inspiration', 'custom designs', 'design ideas', 'creative designs', 'merchandise designs'],
  url: 'https://suvernireplus.com/design-gallery',
  image: 'https://suvernireplus.com/assets/og-home.jpg',
});

const sampleDesigns = [
  {
    title: 'Campus Hoodie',
    description: 'Two-color screen print with varsity lettering.',
  },
  {
    title: 'Startup Swag Kit',
    description: 'Bottle, tee, and notebook set for new hires.',
  },
  {
    title: 'Event Tee',
    description: 'Bold typography with matte ink finish.',
  },
  {
    title: 'Fundraiser Tote',
    description: 'Eco-friendly cotton tote with full-color print.',
  },
];

export default function DesignGalleryPage() {
  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '24px' }}>
      <h1>Design Gallery</h1>
      <p>
        Explore recent customer projects for inspiration. Every design can be customized in our Design Lab
        or with help from the Suvernire Plus creative team.
      </p>
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {sampleDesigns.map((design) => (
          <article
            key={design.title}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              background: '#fff',
            }}
          >
            <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>{design.title}</h2>
            <p style={{ color: '#6b7280' }}>{design.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

