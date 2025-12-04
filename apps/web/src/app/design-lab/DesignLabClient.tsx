'use client';

/**
 * Design Lab Client (temporary stub)
 * [2025-12-04 10:20:00] 为保证构建与部署稳定，暂时用精简版本替换复杂实现，完整像素级版本保留在 Git 历史中
 */
import React from 'react';

const DesignLabClient: React.FC = () => {
  return (
    <section
      className="design-lab-placeholder"
      style={{
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        padding: '32px',
        textAlign: 'center',
      }}
    >
      <div>
        <h1 style={{ fontSize: '28px', marginBottom: '12px' }}>Design Lab 正在升级</h1>
        <p style={{ color: '#6b7280', maxWidth: 520, margin: '0 auto' }}>
          由于 JSX 结构非常复杂，我们暂时使用简化版本，以便顺利构建和部署到 GCP。
          完整的像素级复刻实现可以从 Git 历史中恢复并单独调试。
        </p>
      </div>
    </section>
  );
};

export default DesignLabClient;


