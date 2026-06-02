'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminSettingsApi, PrintPricingConfig, PrintSizeTier, QuantityTier } from '@/lib/api';

const DEFAULT_PRICING: PrintPricingConfig = {
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

const DEFAULT_TIERS: QuantityTier[] = [
  { minQty: 10, discount: 5,  label: '10+ 件' },
  { minQty: 25, discount: 10, label: '25+ 件' },
  { minQty: 50, discount: 15, label: '50+ 件' },
];

type Method = 'dtf' | 'embroidery';
type Size   = 'small' | 'medium' | 'large';

const METHOD_LABELS: Record<Method, string> = { dtf: 'DTF Print', embroidery: 'Embroidery' };
const SIZE_KEYS: Size[] = ['small', 'medium', 'large'];

export default function PrintPricingPage() {
  const [config, setConfig]         = useState<PrintPricingConfig>(DEFAULT_PRICING);
  const [tiers, setTiers]           = useState<QuantityTier[]>(DEFAULT_TIERS);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [savingTiers, setSavingTiers]   = useState(false);
  const [savedTiers, setSavedTiers]     = useState(false);
  const [error, setError]           = useState('');
  const [tierError, setTierError]   = useState('');

  useEffect(() => {
    Promise.all([
      adminSettingsApi.getPrintPricing().then(res => setConfig(res.data)).catch(() => {}),
      adminSettingsApi.getQuantityTiers().then(res => setTiers(res.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const updatePricing = (method: Method, size: Size, field: keyof PrintSizeTier, raw: string) => {
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

  const handleSavePricing = async () => {
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

  const updateTier = (idx: number, field: keyof QuantityTier, raw: string) => {
    setSavedTiers(false);
    setTiers(prev => prev.map((t, i) => {
      if (i !== idx) return t;
      const numVal = parseInt(raw, 10) || 0;
      return { ...t, [field]: field === 'label' ? raw : numVal };
    }));
  };

  const addTier = () => {
    setTiers(prev => [...prev, { minQty: 0, discount: 0, label: '' }]);
    setSavedTiers(false);
  };

  const removeTier = (idx: number) => {
    setTiers(prev => prev.filter((_, i) => i !== idx));
    setSavedTiers(false);
  };

  const handleSaveTiers = async () => {
    setSavingTiers(true);
    setTierError('');
    try {
      await adminSettingsApi.updateQuantityTiers(tiers);
      setSavedTiers(true);
      setTimeout(() => setSavedTiers(false), 3000);
    } catch {
      setTierError('保存失败，请重试');
    } finally {
      setSavingTiers(false);
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
          {/* ── Print Method Pricing ── */}
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
                          onChange={e => updatePricing(method, size, 'label', e.target.value)}
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
                            onChange={e => updatePricing(method, size, 'price', e.target.value)}
                            style={{ ...inputStyle, paddingLeft: 24 }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>说明文字</label>
                        <input
                          value={tier.desc}
                          onChange={e => updatePricing(method, size, 'desc', e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginBottom: 8 }}>
            {saved  && <span style={{ fontSize: 13, color: '#008060' }}>✓ 已保存</span>}
            {error  && <span style={{ fontSize: 13, color: '#d82c0d' }}>{error}</span>}
            <button
              type="button"
              onClick={handleSavePricing}
              disabled={saving}
              style={btnStyle(saving)}
            >
              {saving ? '保存中…' : '保存印刷定价'}
            </button>
          </div>

          <p style={{ fontSize: 12, color: '#6d7175', marginTop: 4, marginBottom: 32 }}>
            价格为每个印刷面收取一次。修改后前端展示价格同步更新，立即生效。
          </p>

          {/* ── Quantity Tiers ── */}
          <div
            style={{
              background: '#fff', border: '1px solid #e1e3e5', borderRadius: 8,
              padding: '20px 24px', marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#202223' }}>
                量价阶梯（数量折扣）
              </h2>
              <button type="button" onClick={addTier} style={addBtnStyle}>
                + 添加阶梯
              </button>
            </div>

            {tiers.length === 0 ? (
              <p style={{ fontSize: 13, color: '#6d7175', margin: 0 }}>暂无阶梯，点击"添加阶梯"创建。</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['最低数量（件）', '折扣（%）', '显示标签', ''].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tiers.map((t, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f2f3' }}>
                      <td style={tdStyle}>
                        <input
                          type="number"
                          min="1"
                          value={t.minQty}
                          onChange={e => updateTier(idx, 'minQty', e.target.value)}
                          style={{ ...inputStyle, width: 80 }}
                        />
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={t.discount}
                            onChange={e => updateTier(idx, 'discount', e.target.value)}
                            style={{ ...inputStyle, width: 70 }}
                          />
                          <span style={{ fontSize: 13, color: '#6d7175' }}>%</span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={t.label}
                          onChange={e => updateTier(idx, 'label', e.target.value)}
                          placeholder={`${t.minQty}+ 件`}
                          style={{ ...inputStyle, width: 120 }}
                        />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => removeTier(idx)}
                          style={{
                            background: 'none', border: 'none', color: '#d82c0d',
                            cursor: 'pointer', fontSize: 13, padding: '4px 8px',
                          }}
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginBottom: 8 }}>
            {savedTiers && <span style={{ fontSize: 13, color: '#008060' }}>✓ 已保存</span>}
            {tierError  && <span style={{ fontSize: 13, color: '#d82c0d' }}>{tierError}</span>}
            <button
              type="button"
              onClick={handleSaveTiers}
              disabled={savingTiers}
              style={btnStyle(savingTiers)}
            >
              {savingTiers ? '保存中…' : '保存量价阶梯'}
            </button>
          </div>

          <p style={{ fontSize: 12, color: '#6d7175', marginTop: 4 }}>
            阶梯按最低数量自动排序。客户下单数量达到阶梯门槛时，单价按对应折扣率降低。
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

const thStyle: React.CSSProperties = {
  textAlign: 'left', fontSize: 11, color: '#6d7175', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: 0.4, padding: '6px 8px',
  borderBottom: '1px solid #e1e3e5',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 8px', verticalAlign: 'middle',
};

const btnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '9px 28px', borderRadius: 6, border: 'none',
  background: '#008060', color: '#fff',
  fontWeight: 500, fontSize: 14, cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.7 : 1,
});

const addBtnStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 5, border: '1px solid #c9cccf',
  background: '#fff', color: '#202223', fontSize: 13, cursor: 'pointer', fontWeight: 500,
};
