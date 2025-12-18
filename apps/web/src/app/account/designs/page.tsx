/**
 * Account Designs Page
 * [2025-12-18 23:25:00] 我的设计页面
 */
'use client';

import { useState, useEffect } from 'react';
import { designsApi } from '@/lib/api';
import type { Design } from '@/lib/api';

export default function AccountDesignsPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        setLoading(true);
        const response = await designsApi.list();
        setDesigns(response.designs || []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load designs';
        setError(errorMessage);
        console.error('[AccountDesigns] Error loading designs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDesigns();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <p>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: '#ef4444' }}>错误: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '24px' }}>我的设计</h1>
      
      {designs.length === 0 ? (
        <div style={{ 
          padding: '48px', 
          textAlign: 'center', 
          backgroundColor: '#f8fafc', 
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '16px' }}>
            您还没有保存任何设计
          </p>
          <a 
            href="/design-lab" 
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: '#2563eb',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '6px',
              fontWeight: '500'
            }}
          >
            开始设计
          </a>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
          gap: '24px' 
        }}>
          {designs.map((design) => (
            <div 
              key={design.id}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => window.location.href = `/design-lab?design=${design.id}`}
            >
              {design.thumbnail && (
                <img 
                  src={design.thumbnail} 
                  alt={design.name || 'Design'}
                  style={{
                    width: '100%',
                    height: '200px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    marginBottom: '12px'
                  }}
                />
              )}
              <h3 style={{ 
                fontSize: '1.1rem', 
                fontWeight: '600', 
                marginBottom: '8px',
                color: '#1f2937'
              }}>
                {design.name || '未命名设计'}
              </h3>
              {design.createdAt && (
                <p style={{ fontSize: '0.875rem', color: '#666' }}>
                  {new Date(design.createdAt).toLocaleDateString('zh-CN')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
