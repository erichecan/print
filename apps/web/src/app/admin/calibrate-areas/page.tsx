'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { adminProductsApi, AdminProductSummary, AdminProductDetail } from '@/lib/api';
import { PrintableAreaCalibrator, type CalibView, type AreaRect } from '@/components/admin/products/ProductWizard/components/PrintableAreaCalibrator';
import {
  PRINTABLE_AREA_TEMPLATES,
  GARMENT_TYPE_LABELS,
  GARMENT_TYPES,
  type GarmentType,
} from '@/app/design-lab/config/printable-area-templates';

// ─── defaults ────────────────────────────────────────────────────────────────
const D_FRONT:  AreaRect = { x: 327, y: 240, width: 546, height: 960 };
const D_BACK:   AreaRect = { x: 327, y: 240, width: 546, height: 960 };
const D_SLEEVE: AreaRect = { x: 350, y: 470, width: 500, height: 500 };

type AreasState = { front: AreaRect; back: AreaRect; 'left-sleeve': AreaRect; 'right-sleeve': AreaRect };

function templateAreas(garmentType: string | null | undefined): AreasState {
  const tpl = PRINTABLE_AREA_TEMPLATES[garmentType as GarmentType];
  if (!tpl) return { front: D_FRONT, back: D_BACK, 'left-sleeve': D_SLEEVE, 'right-sleeve': D_SLEEVE };
  const leftSleeve  = tpl['left-sleeve']  ?? (tpl as any).sleeve ?? D_SLEEVE;
  const rightSleeve = tpl['right-sleeve'] ?? (tpl as any).sleeve ?? D_SLEEVE;
  return {
    front:         tpl.front ?? D_FRONT,
    back:          tpl.back  ?? D_BACK,
    'left-sleeve': leftSleeve,
    'right-sleeve': rightSleeve,
  };
}

function initAreas(product: AdminProductDetail): AreasState {
  const pa = product.printableArea;
  if (pa) {
    const fallbackSleeve = (pa as any).sleeve ?? D_SLEEVE;
    return {
      front:          pa.front ?? D_FRONT,
      back:           pa.back  ?? D_BACK,
      'left-sleeve':  pa['left-sleeve']  ?? fallbackSleeve,
      'right-sleeve': pa['right-sleeve'] ?? fallbackSleeve,
    };
  }
  return templateAreas(product.garmentType);
}

function getImages(product: AdminProductDetail) {
  const ci = product.colorImages?.[0];
  if (ci?.imageUrls?.length) {
    return {
      front:          ci.imageUrls[0] || undefined,
      back:           ci.imageUrls[1] || undefined,
      'left-sleeve':  ci.imageUrls[2] || undefined,
      'right-sleeve': ci.imageUrls[3] || ci.imageUrls[2] || undefined,
    };
  }
  const imgs = product.images ?? [];
  return {
    front:          imgs[0]?.url,
    back:           imgs[1]?.url,
    'left-sleeve':  imgs[2]?.url,
    'right-sleeve': imgs[3]?.url ?? imgs[2]?.url,
  };
}

// ─── fuzzy match ──────────────────────────────────────────────────────────────
function matches(p: AdminProductSummary, q: string) {
  if (!q) return true;
  const s = q.toLowerCase();
  return p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s);
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function CalibrateAreasPage() {
  const [allProducts, setAllProducts]   = useState<AdminProductSummary[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [product, setProduct]           = useState<AdminProductDetail | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  // calibration state
  const [garmentType, setGarmentType]   = useState<string>('');
  const [areas, setAreas]               = useState<AreasState>({
    front: D_FRONT, back: D_BACK, 'left-sleeve': D_SLEEVE, 'right-sleeve': D_SLEEVE,
  });
  const [saveStatus, setSaveStatus]     = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isDirty, setIsDirty]           = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── load product list ──────────────────────────────────────────────────────
  useEffect(() => {
    adminProductsApi.list({ limit: 500 })
      .then(res => setAllProducts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = allProducts.filter(p => matches(p, search));

  // reset index when search changes
  useEffect(() => { setCurrentIndex(0); }, [search]);

  // ── load full product when index changes ───────────────────────────────────
  useEffect(() => {
    const p = filtered[currentIndex];
    if (!p) { setProduct(null); return; }

    setLoadingProduct(true);
    setSaveStatus('idle');
    setIsDirty(false);
    adminProductsApi.get(p.id)
      .then(detail => {
        setProduct(detail);
        setGarmentType(detail.garmentType ?? '');
        setAreas(initAreas(detail));
      })
      .catch(() => {})
      .finally(() => setLoadingProduct(false));
  }, [currentIndex, filtered.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowLeft')  setCurrentIndex(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setCurrentIndex(i => Math.min(filtered.length - 1, i + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered.length]);

  // ── calibrator onChange ────────────────────────────────────────────────────
  const handleCalibChange = useCallback((view: CalibView, area: AreaRect) => {
    setAreas(prev => ({ ...prev, [view]: area }));
    setIsDirty(true);
    setSaveStatus('idle');
  }, []);

  // ── garment type change → apply template ──────────────────────────────────
  const handleGarmentTypeChange = useCallback((gt: string) => {
    setGarmentType(gt);
    setAreas(templateAreas(gt));
    setIsDirty(true);
    setSaveStatus('idle');
  }, []);

  // ── reset to template ──────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    const base = garmentType || product?.garmentType;
    setAreas(templateAreas(base));
    setIsDirty(true);
    setSaveStatus('idle');
  }, [garmentType, product?.garmentType]);

  // ── save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!product) return;
    setSaveStatus('saving');
    try {
      await adminProductsApi.update(product.id, {
        garmentType: garmentType || undefined,
        printableArea: {
          front:          areas.front,
          back:           areas.back,
          sleeve:         areas['left-sleeve'],
          'left-sleeve':  areas['left-sleeve'],
          'right-sleeve': areas['right-sleeve'],
        },
      });
      setSaveStatus('saved');
      setIsDirty(false);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    }
  }, [product, garmentType, areas]);

  // ── images ─────────────────────────────────────────────────────────────────
  const images: { front?: string; back?: string; 'left-sleeve'?: string; 'right-sleeve'?: string } =
    product ? getImages(product) : {};

  // ── render ─────────────────────────────────────────────────────────────────
  const total = filtered.length;

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>

      {/* ── header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin/online-products" style={{ color: '#6d7175', fontSize: 13, textDecoration: 'none' }}>
            ← 商品列表
          </Link>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#202223' }}>
            可打印区域标定
          </h1>
        </div>
        <span style={{ fontSize: 12, color: '#6d7175' }}>← → 键盘切换</span>
      </div>

      {/* ── search + navigation ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="搜索商品名称或 SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, padding: '8px 12px', border: '1px solid #c9cccf',
            borderRadius: 6, fontSize: 14, outline: 'none',
          }}
        />
        <span style={{ fontSize: 13, color: '#6d7175', whiteSpace: 'nowrap', minWidth: 60, textAlign: 'center' }}>
          {loading ? '…' : `${total === 0 ? 0 : currentIndex + 1} / ${total}`}
        </span>
        <button
          type="button"
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={currentIndex === 0 || total === 0}
          style={navBtnStyle}
          title="上一个 (←)"
        >
          ◀
        </button>
        <button
          type="button"
          onClick={() => setCurrentIndex(i => Math.min(total - 1, i + 1))}
          disabled={currentIndex >= total - 1 || total === 0}
          style={navBtnStyle}
          title="下一个 (→)"
        >
          ▶
        </button>
      </div>

      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: '#6d7175', fontSize: 14 }}>
          加载商品列表中…
        </div>
      )}

      {!loading && total === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#6d7175', fontSize: 14 }}>
          没有匹配的商品
        </div>
      )}

      {!loading && total > 0 && (
        <>
          {/* ── product info bar ── */}
          <div style={{
            background: '#fff', border: '1px solid #e1e3e5', borderRadius: 8,
            padding: '14px 18px', marginBottom: 16,
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          }}>
            {loadingProduct ? (
              <span style={{ fontSize: 14, color: '#6d7175' }}>加载中…</span>
            ) : product ? (
              <>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#202223' }}>{product.name}</div>
                  <div style={{ fontSize: 12, color: '#6d7175', marginTop: 2 }}>SKU: {product.sku}</div>
                </div>

                {/* garment type */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontSize: 13, color: '#202223', whiteSpace: 'nowrap' }}>服装类型</label>
                  <select
                    value={garmentType}
                    onChange={e => handleGarmentTypeChange(e.target.value)}
                    style={{
                      padding: '5px 8px', border: '1px solid #c9cccf',
                      borderRadius: 4, fontSize: 13, background: '#fff',
                    }}
                  >
                    <option value="">-- 未设置 --</option>
                    {GARMENT_TYPES.map(gt => (
                      <option key={gt} value={gt}>{GARMENT_TYPE_LABELS[gt]}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    padding: '5px 12px', border: '1px solid #c9cccf', borderRadius: 4,
                    background: '#fff', fontSize: 13, cursor: 'pointer', color: '#202223',
                  }}
                >
                  重置为模板
                </button>

                {/* calibration status badge */}
                <div style={{
                  fontSize: 12, padding: '3px 8px', borderRadius: 10,
                  background: product.printableArea ? '#e3f5eb' : '#f6f6f7',
                  color: product.printableArea ? '#008060' : '#6d7175',
                  border: `1px solid ${product.printableArea ? '#a3d6bf' : '#d2d5d8'}`,
                  whiteSpace: 'nowrap',
                }}>
                  {product.printableArea ? '已标定' : '使用模板'}
                </div>
              </>
            ) : null}
          </div>

          {/* ── calibrator ── */}
          {product && !loadingProduct && (
            <div style={{ background: '#fff', border: '1px solid #e1e3e5', borderRadius: 8, padding: 18 }}>
              <PrintableAreaCalibrator
                imageUrls={images}
                areas={areas}
                onChange={handleCalibChange}
              />
            </div>
          )}

          {/* ── save bar ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: 12, marginTop: 16,
          }}>
            {isDirty && (
              <span style={{ fontSize: 13, color: '#8c6f00' }}>● 有未保存的更改</span>
            )}
            {saveStatus === 'saved' && (
              <span style={{ fontSize: 13, color: '#008060' }}>✓ 已保存</span>
            )}
            {saveStatus === 'error' && (
              <span style={{ fontSize: 13, color: '#d82c0d' }}>✗ 保存失败，请重试</span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === 'saving' || !product}
              style={{
                padding: '8px 24px', borderRadius: 6, border: 'none',
                background: isDirty ? '#008060' : '#d2d5d8',
                color: isDirty ? '#fff' : '#6d7175',
                fontWeight: 500, fontSize: 14, cursor: isDirty ? 'pointer' : 'default',
                transition: 'background 0.15s',
              }}
            >
              {saveStatus === 'saving' ? '保存中…' : '保存'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  padding: '6px 14px', border: '1px solid #c9cccf', borderRadius: 6,
  background: '#fff', fontSize: 14, cursor: 'pointer', color: '#202223',
  lineHeight: 1,
};
