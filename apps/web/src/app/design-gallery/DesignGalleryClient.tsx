/**
 * Design Gallery Client Component
 * [2025-12-06 20:00:00] 设计画廊客户端组件 for Issue #142
 */
'use client';

import { SocialShareMenu } from '@/components/social-share';
import { useEffect, useState } from 'react';

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

export default function DesignGalleryClient() {
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.href);
    }
  }, []);

  return (
    <section className="container" style={{ padding: '72px 0', display: 'grid', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <h1>Design Gallery</h1>
          <p>
            Explore recent customer projects for inspiration. Every design can be customized in our Design Lab
            or with help from the Suvernire Plus creative team.
          </p>
        </div>
        {/* [2025-12-06 20:00:00] 社交媒体分享按钮 for Issue #142 */}
        {currentUrl && (
          <div style={{ marginTop: '8px' }}>
            <SocialShareMenu
              config={{
                url: currentUrl,
                title: 'Design Gallery - Custom Design Inspiration',
                description: 'Explore our design gallery for inspiration. See custom t-shirt designs, hoodies, promotional products, and creative merchandise ideas.',
                image: typeof window !== 'undefined' ? `${window.location.origin}/assets/og-home.jpg` : '',
                hashtags: ['DesignGallery', 'CustomDesign', 'DesignInspiration'],
              }}
              onShare={(platform) => {
                console.log(`[2025-12-06 20:00:00] Shared Design Gallery to ${platform}`);
              }}
            />
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {sampleDesigns.map((design) => (
          <article
            key={design.title}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              background: '#fff',
              position: 'relative',
            }}
          >
            <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>{design.title}</h2>
            <p style={{ color: '#6b7280', marginBottom: '12px' }}>{design.description}</p>
            {/* [2025-12-06 20:00:00] 每个设计项目的分享按钮 for Issue #142 */}
            {currentUrl && (
              <div style={{ marginTop: '12px' }}>
                <SocialShareMenu
                  config={{
                    url: currentUrl,
                    title: `${design.title} - Design Gallery`,
                    description: design.description,
                    hashtags: ['DesignGallery', 'CustomDesign'],
                  }}
                  onShare={(platform) => {
                    console.log(`[2025-12-06 20:00:00] Shared design "${design.title}" to ${platform}`);
                  }}
                />
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

