'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminSettingsApi, PrintPricingConfig, PrintSizeTier } from '@/lib/api';

const DEFAULT: PrintPricingConfig = {
  dtf: {
    small:  { price: 5.99,  label: 'Under 5"',  desc: 'Left chest / small logo' },
    medium: { price: 8.99,  label: '5" – 11"',  desc: 'Standard front print' },
    large:  { price: 11.99, label: '11" – 22"', desc: 'Full front / back' },
  },
  embroidery: {
    small:  { price: 14.99, label: 'Under 5"',  desc: 'Left chest / small logo' },
    medium: { price: 24.99, label: '5" – 11"',  desc: 'Standard / medium' },
    large:  { price: 24.99, label: '11" – 22"', desc: 'Large area' },
  },
};

type Method = 'dtf' | 'embroidery';
type Size   = 'small' | 'medium' | 'large';

const METHOD_LABELS: Record<Method, string> = { dtf: 'DTF Print', embroidery: 'Embroidery' };
const SIZE_KEYS: Size[] = ['small', 'medium', 'large'];

export default function PrintPricingPage() {
  const [config, setConfig]     = useState<PrintPricingConfig>(DEFAULT);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    adminSettingsApi.getPrintPricing()
      .then(res => setConfig(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (method: Method, size: Size, field: keyof PrintSizeTier, raw: string) => {
    setSaved(false);
    setConfig(prev => ({
      ...prev,
      [method]: {
        ...prev[method],
        [size]: {
          ...prev[method][size],
          [field]: field === 'price' ? (parseFloat(raw) || 0) : raw,
        },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await adminSettingsApi.updatePrintPricing(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/admin/settings" style={{ color: '#6d7175', fontSize: 13, textDecoration: 'none' }}>
          ← 设置
        </Link>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#202223' }}>
          印刷附加费定价
        </h1>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6d7175', fontSize: 14 }}>加载中…</div>
      ) : (
        <>
          {(['dtf', 'embroidery'] as Method[]).map(method => (
            <div
              key={method}
              style={{
                background: '#fff', border: '1px solid #e1e3e5', borderRadius: 8,
                padding: '20px 24px', marginBottom: 20,
              }}
            >
              <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#202223' }}>
                {METHOD_LABELS[method]}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {SIZE_KEYS.map(size => {
                  const tier = config[method][size];
                  return (
                    <div
                      key={size}
                      style={{
                        border: '1px solid #e1e3e5', borderRadius: 6,
                        padding: '14px 16px', background: '#fafafa',
                      }}
                    >
                      <div style={{ marginBottom: 10 }}>
                        <label style={labelStyle}>尺寸标签</label>
                        <input
                          value={tier.label}
                          onChange={e => update(method, size, 'label', e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={labelStyle}>价格 ($/每面)</label>
                        <div style={{ position: 'relative' }}>
                          <span style={{
                            position: 'absolute', left: 10, top: '50%',
                            transform: 'translateY(-50%)', color: '#6d7175', fontSize: 14,
                          }}>$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={tier.price}
                            onChange={e => update(method, size, 'price', e.target.value)}
                            style={{ ...inputStyle, paddingLeft: 24 }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>说明文字</label>
                        <input
                          value={tier.desc}
                          onChange={e => update(method, size, 'desc', e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
            {saved  && <span style={{ fontSize: 13, color: '#008060' }}>✓ 已保存</span>}
            {error  && <span style={{ fontSize: 13, color: '#d82c0d' }}>{error}</span>}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '9px 28px', borderRadius: 6, border: 'none',
                background: '#008060', color: '#fff',
                fontWeight: 500, fontSize: 14, cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? '保存中…' : '保存'}
            </button>
          </div>

          <p style={{ fontSize: 12, color: '#6d7175', marginTop: 16 }}>
            价格为每个印刷面收取一次。前端展示价格同步更新，修改后立即生效。
          </p>
        </>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#6d7175',
  marginBottom: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px', border: '1px solid #c9cccf',
  borderRadius: 4, fontSize: 13, background: '#fff', boxSizing: 'border-box',
  outline: 'none',
};
