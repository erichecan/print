'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { factoryQueueApi } from '@/lib/api';

const CM_PER_IN = 2.54;
const PX_PER_IN = 32; // screen preview: 32px per inch

type GangTile = {
  key: string;
  order: {
    id: string;
    orderNumber: string;
    email: string;
    productionStatus: string;
    printSpecs: { widthCm?: number; heightCm?: number; positions?: string[]; method?: string; notes?: string } | null;
    qrCode: string;
    items: Array<{
      quantity: number;
      variant: { color: string; size: string; product: { name: string; images: { url: string }[] } } | null;
    }>;
  };
  widthIn: number;
  heightIn: number;
};

type TilePos = { x: number; y: number };

function computeLayout(
  tiles: GangTile[],
  sheetWidthIn: number,
  marginIn: number,
  gapIn: number
): { positions: TilePos[]; totalHeightIn: number } {
  const usableWidth = sheetWidthIn - 2 * marginIn;
  let x = 0;
  let y = marginIn;
  let rowMaxH = 0;
  const positions: TilePos[] = [];

  for (const tile of tiles) {
    if (x > 0.001 && x + tile.widthIn > usableWidth + 0.001) {
      y += rowMaxH + gapIn;
      x = 0;
      rowMaxH = 0;
    }
    positions.push({ x: marginIn + x, y });
    x += tile.widthIn + gapIn;
    rowMaxH = Math.max(rowMaxH, tile.heightIn);
  }

  return { positions, totalHeightIn: y + rowMaxH + marginIn };
}

const inputStyle: React.CSSProperties = {
  padding: '4px 8px', border: '1px solid #CBD5E1', borderRadius: 6,
  fontSize: 13, width: 68, background: '#fff',
};

const smallBtnStyle: React.CSSProperties = {
  padding: '2px 8px', border: '1px solid #E2E8F0', borderRadius: 6,
  fontSize: 12, background: '#fff', cursor: 'pointer', fontWeight: 600,
  lineHeight: 1.6,
};

function GangSheetInner() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get('ids') || '';

  const [tiles, setTiles] = useState<GangTile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sheet config (inches)
  const [sheetWidthIn, setSheetWidthIn] = useState(23);
  const [marginIn, setMarginIn] = useState(2);
  const [gapIn, setGapIn] = useState(0);

  useEffect(() => {
    if (!idsParam) { setError('No orders selected.'); setLoading(false); return; }
    const ids = idsParam.split(',').filter(Boolean);
    factoryQueueApi.getGangSheetData(ids)
      .then((res) => {
        const initial: GangTile[] = res.data.map((order: GangTile['order'], i: number) => {
          const specs = order.printSpecs;
          const widthIn = specs?.widthCm ? +(specs.widthCm / CM_PER_IN).toFixed(2) : 8;
          const heightIn = specs?.heightCm ? +(specs.heightCm / CM_PER_IN).toFixed(2) : 8;
          return { key: `${order.id}-${i}`, order, widthIn, heightIn };
        });
        setTiles(initial);
      })
      .catch(() => setError('Failed to load gang sheet data.'))
      .finally(() => setLoading(false));
  }, [idsParam]);

  const { positions, totalHeightIn } = computeLayout(tiles, sheetWidthIn, marginIn, gapIn);
  const usableWidthIn = sheetWidthIn - 2 * marginIn;

  function moveTile(i: number, dir: -1 | 1) {
    setTiles((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function removeTile(i: number) {
    setTiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateTile(i: number, field: 'widthIn' | 'heightIn', val: number) {
    setTiles((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  }

  if (loading) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#6B7280', fontSize: 15 }}>Loading gang sheet…</div>;
  }
  if (error) {
    return <div style={{ padding: 60, textAlign: 'center', color: '#EF4444', fontSize: 15 }}>{error}</div>;
  }

  const screenW = sheetWidthIn * PX_PER_IN;
  const screenH = totalHeightIn * PX_PER_IN;
  const printPageH = `${totalHeightIn.toFixed(4)}in`;

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Control bar ── */}
      <div className="no-print" style={{
        padding: '12px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
        display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap', flexShrink: 0,
      }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>DTF Gang Sheet</div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 13 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Sheet W (in):
            <input
              type="number" value={sheetWidthIn} min={1} step={0.5}
              onChange={(e) => setSheetWidthIn(Number(e.target.value))}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Margin (in):
            <input
              type="number" value={marginIn} min={0} step={0.25}
              onChange={(e) => setMarginIn(Number(e.target.value))}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Gap (in):
            <input
              type="number" value={gapIn} min={0} step={0.1}
              onChange={(e) => setGapIn(Number(e.target.value))}
              style={inputStyle}
            />
          </label>
        </div>

        <div style={{ fontSize: 12, color: '#64748B', padding: '4px 10px', background: '#EFF6FF', borderRadius: 8 }}>
          Usable: <strong>{usableWidthIn.toFixed(1)}"</strong> × <strong>{(totalHeightIn - marginIn).toFixed(1)}"</strong>
          &nbsp;·&nbsp;{tiles.length} tile{tiles.length !== 1 ? 's' : ''}
          &nbsp;·&nbsp;Total height: <strong>{totalHeightIn.toFixed(1)}"</strong>
        </div>

        <button
          onClick={() => window.print()}
          style={{ marginLeft: 'auto', padding: '10px 24px', background: '#000', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          Print Gang Sheet
        </button>
      </div>

      {/* ── Main area: sidebar + canvas ── */}
      <div className="no-print" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Tile list sidebar */}
        <div style={{
          width: 264, flexShrink: 0, borderRight: '1px solid #E2E8F0',
          padding: '14px 12px', overflowY: 'auto', background: '#fff',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Tiles ({tiles.length})
          </div>
          {tiles.map((tile, i) => {
            const item = tile.order.items?.[0];
            const product = item?.variant?.product;
            return (
              <div key={tile.key} style={{ padding: '10px 10px', border: '1px solid #E2E8F0', borderRadius: 10, marginBottom: 8, background: '#FAFAFA' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tile.order.orderNumber}</div>
                    <div style={{ fontSize: 11, color: '#6B7280', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {product?.name ?? '—'}
                    </div>
                    {item?.variant && (
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                        {item.variant.color} / {item.variant.size} ×{item.quantity}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0, marginLeft: 6 }}>
                    <button onClick={() => moveTile(i, -1)} disabled={i === 0} style={{ ...smallBtnStyle, opacity: i === 0 ? 0.35 : 1 }}>↑</button>
                    <button onClick={() => moveTile(i, 1)} disabled={i === tiles.length - 1} style={{ ...smallBtnStyle, opacity: i === tiles.length - 1 ? 0.35 : 1 }}>↓</button>
                    <button onClick={() => removeTile(i)} style={{ ...smallBtnStyle, color: '#EF4444', borderColor: '#FCA5A5' }}>×</button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 12, alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    W:
                    <input
                      type="number" value={tile.widthIn} min={0.5} step={0.25}
                      onChange={(e) => updateTile(i, 'widthIn', Number(e.target.value))}
                      style={{ ...inputStyle, width: 56 }}
                    />
                    <span style={{ color: '#9CA3AF' }}>in</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    H:
                    <input
                      type="number" value={tile.heightIn} min={0.5} step={0.25}
                      onChange={(e) => updateTile(i, 'heightIn', Number(e.target.value))}
                      style={{ ...inputStyle, width: 56 }}
                    />
                    <span style={{ color: '#9CA3AF' }}>in</span>
                  </label>
                </div>
              </div>
            );
          })}
          {tiles.length === 0 && (
            <div style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>No tiles</div>
          )}
        </div>

        {/* Preview canvas area */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24, background: '#E2E8F0' }}>
          <div style={{ display: 'inline-block', position: 'relative' }}>
            {/* Sheet */}
            <div
              style={{
                width: screenW, height: screenH,
                position: 'relative', background: '#fff',
                border: '2px solid #64748B',
                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
              }}
            >
              {/* Margin guide */}
              <div style={{
                position: 'absolute',
                left: marginIn * PX_PER_IN, top: marginIn * PX_PER_IN,
                width: usableWidthIn * PX_PER_IN,
                height: Math.max(0, (totalHeightIn - 2 * marginIn) * PX_PER_IN),
                border: '1px dashed #94A3B8', pointerEvents: 'none',
              }} />

              {/* Tiles */}
              {tiles.map((tile, i) => {
                const pos = positions[i];
                if (!pos) return null;
                const tW = tile.widthIn * PX_PER_IN;
                const tH = tile.heightIn * PX_PER_IN;
                const item = tile.order.items?.[0];
                const product = item?.variant?.product;
                const imgUrl = product?.images?.[0]?.url;
                const qrSize = Math.min(tW * 0.28, tH * 0.28, 64);
                const labelFontSize = Math.max(7, Math.min(11, tW / 18));

                return (
                  <div
                    key={tile.key}
                    style={{
                      position: 'absolute',
                      left: pos.x * PX_PER_IN,
                      top: pos.y * PX_PER_IN,
                      width: tW, height: tH,
                      border: '1.5px solid #334155',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      background: '#F1F5F9',
                    }}
                  >
                    {/* Checkerboard bg for transparent designs */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
                      backgroundSize: '10px 10px', backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                    }} />

                    {imgUrl && (
                      <img src={imgUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                    )}

                    {/* Top-left label */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0,
                      right: qrSize + 2,
                      background: 'rgba(0,0,0,0.62)', color: '#fff',
                      padding: '2px 5px', fontSize: labelFontSize, fontWeight: 700, lineHeight: 1.35,
                    }}>
                      <div>{tile.order.orderNumber}</div>
                      {item?.variant && (
                        <div style={{ fontWeight: 400, opacity: 0.85, fontSize: labelFontSize - 1 }}>
                          {item.variant.color} / {item.variant.size} ×{item.quantity}
                        </div>
                      )}
                      {tile.order.printSpecs?.positions?.length ? (
                        <div style={{ fontWeight: 400, opacity: 0.75, fontSize: labelFontSize - 1 }}>
                          {tile.order.printSpecs.positions.join(', ')}
                          {tile.order.printSpecs.method ? ` · ${tile.order.printSpecs.method}` : ''}
                        </div>
                      ) : null}
                    </div>

                    {/* Size label bottom-left */}
                    <div style={{
                      position: 'absolute', bottom: 2, left: 4,
                      fontSize: Math.max(7, labelFontSize - 2), color: 'rgba(0,0,0,0.45)', fontWeight: 600,
                    }}>
                      {tile.widthIn}" × {tile.heightIn}"
                    </div>

                    {/* QR code bottom-right */}
                    {tile.order.qrCode && (
                      <img
                        src={tile.order.qrCode}
                        alt="QR"
                        style={{
                          position: 'absolute', bottom: 2, right: 2,
                          width: qrSize, height: qrSize,
                          background: '#fff', padding: 2,
                          border: '1px solid #E2E8F0',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Scale label */}
            <div style={{ marginTop: 8, textAlign: 'center', fontSize: 11, color: '#64748B' }}>
              {sheetWidthIn}" × {totalHeightIn.toFixed(1)}"&nbsp;&nbsp;|&nbsp;&nbsp;1 in = {PX_PER_IN}px preview
            </div>
          </div>
        </div>
      </div>

      {/* ── Print-only layout ── */}
      <div className="print-only" style={{ display: 'none' }}>
        <div style={{
          width: `${sheetWidthIn}in`,
          height: printPageH,
          position: 'relative',
          background: '#fff',
          margin: 0,
        }}>
          {tiles.map((tile, i) => {
            const pos = positions[i];
            if (!pos) return null;
            const item = tile.order.items?.[0];
            const product = item?.variant?.product;
            const imgUrl = product?.images?.[0]?.url;
            const qrSizeIn = Math.min(tile.widthIn * 0.22, tile.heightIn * 0.22, 1.2);

            return (
              <div
                key={tile.key}
                style={{
                  position: 'absolute',
                  left: `${pos.x}in`, top: `${pos.y}in`,
                  width: `${tile.widthIn}in`, height: `${tile.heightIn}in`,
                  border: '0.5pt solid #000',
                  boxSizing: 'border-box', overflow: 'hidden', background: '#fff',
                }}
              >
                {imgUrl && (
                  <img src={imgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                )}

                <div style={{
                  position: 'absolute', top: 0, left: 0, right: `${qrSizeIn + 0.05}in`,
                  background: 'rgba(0,0,0,0.65)', color: '#fff',
                  padding: '2pt 4pt', fontSize: '7pt', fontWeight: 700, lineHeight: 1.4,
                }}>
                  <div>{tile.order.orderNumber}</div>
                  {item?.variant && (
                    <div style={{ fontWeight: 400 }}>
                      {item.variant.color} / {item.variant.size} ×{item.quantity}
                    </div>
                  )}
                  {tile.order.printSpecs?.positions?.length ? (
                    <div style={{ fontWeight: 400 }}>
                      {tile.order.printSpecs.positions.join(', ')}
                      {tile.order.printSpecs.method ? ` · ${tile.order.printSpecs.method}` : ''}
                    </div>
                  ) : null}
                </div>

                <div style={{
                  position: 'absolute', bottom: '2pt', left: '3pt',
                  fontSize: '6pt', color: 'rgba(0,0,0,0.4)', fontWeight: 600,
                }}>
                  {tile.widthIn}" × {tile.heightIn}"
                </div>

                {tile.order.qrCode && (
                  <img
                    src={tile.order.qrCode}
                    alt="QR"
                    style={{
                      position: 'absolute', bottom: '2pt', right: '2pt',
                      width: `${qrSizeIn}in`, height: `${qrSizeIn}in`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body > * { display: none !important; }
          body > [data-nextjs-scroll-focus-boundary] { display: block !important; }
          @page { size: ${sheetWidthIn}in ${printPageH}; margin: 0; }
        }
      `}</style>
    </div>
  );
}

export default function GangSheetPage() {
  return (
    <Suspense fallback={<div style={{ padding: 60, textAlign: 'center' }}>Loading…</div>}>
      <GangSheetInner />
    </Suspense>
  );
}
