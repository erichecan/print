'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import QRCode from 'qrcode';
import { adminOrdersApi } from '@/lib/api';

const POSITION_LABELS: Record<string, string> = {
  front: '正面',
  back: '背面',
  left: '左袖',
  right: '右袖',
  left_chest: '左胸',
  right_chest: '右胸',
};

const POSITION_ORDER = ['left', 'right', 'front', 'back', 'left_chest', 'right_chest'];

function QRCanvas({ value, size = 80 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    }).catch(console.error);
  }, [value, size]);
  return <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 3, border: '1px solid #E5E7EB' }} />;
}

export default function GangSheetPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const { data, error, isLoading } = useSWR(
    `gang-sheet-${id}`,
    () => adminOrdersApi.getGangSheet(id),
  );

  const gs = data?.gangSheet;

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        加载生产单…
      </div>
    );
  }

  if (error || !gs) {
    return (
      <div style={{ padding: 40 }}>
        <div style={{ color: '#EF4444', marginBottom: 16 }}>
          {error ? '加载失败：设计稿或物流信息尚未就绪。' : '生产单数据不存在。'}
        </div>
        <Link href={`/admin/online-orders/${id}`} style={{ color: '#3B82F6', fontSize: 14 }}>
          ← 返回订单详情
        </Link>
      </div>
    );
  }

  const positions: any[] = (gs.specs?.positions ?? [])
    .filter((p: any) => p.artworkImageUrl || p.text)
    .sort((a: any, b: any) => {
      const ai = POSITION_ORDER.indexOf(a.position);
      const bi = POSITION_ORDER.indexOf(b.position);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

  const totalQty = (gs.items ?? []).reduce((s: number, it: any) => s + (it.quantity || 0), 0);
  const isMulti = totalQty > 1;
  const isMultiFace = positions.length > 1;
  const firstItem = gs.items?.[0];
  const qrValue = `${gs.order?.orderNumber}|${gs.order?.trackingNumber ?? ''}`;

  return (
    <div>
      {/* Screen-only top bar */}
      <div
        className="no-print"
        style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}
      >
        <Link href={`/admin/online-orders/${id}`} style={{ fontSize: 13, color: '#6B7280', textDecoration: 'none' }}>
          ← 返回订单
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          生产单 — {gs.order?.orderNumber}
        </h1>
        <button
          onClick={() => window.print()}
          style={{
            marginLeft: 'auto', padding: '8px 18px',
            background: '#000', color: '#fff',
            border: 'none', borderRadius: 8,
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}
        >
          打印 / 保存 PDF
        </button>
      </div>

      {/* ─── 整张大版 ─── */}
      <div
        id="gang-sheet-print"
        style={{
          background: '#fff',
          border: '2px solid #374151',
          borderRadius: 8,
          padding: '16px 20px 24px',
          display: 'inline-block',
          minWidth: 600,
        }}
      >

        {/* 信息条 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            paddingBottom: 14,
            marginBottom: 24,
            borderBottom: '1.5px solid #E5E7EB',
            flexWrap: 'wrap',
          }}
        >
          {/* 效果图 */}
          {gs.mockupUrl ? (
            <img
              src={gs.mockupUrl}
              alt="效果图"
              style={{
                flexShrink: 0, width: 80, height: 80,
                objectFit: 'contain', borderRadius: 4,
                border: '1px solid #E5E7EB', background: '#F9FAFB',
              }}
            />
          ) : (
            <div style={{
              flexShrink: 0, width: 80, height: 80,
              background: '#F3F4F6', borderRadius: 4,
              border: '1px dashed #D1D5DB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: '#9CA3AF',
            }}>无效果图</div>
          )}

          {/* 二维码 */}
          <div style={{ flexShrink: 0 }}>
            <QRCanvas value={qrValue} size={80} />
          </div>

          {/* 订单号 */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              订单号
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
              {gs.order?.orderNumber}
            </span>
          </div>

          {/* 分隔线 */}
          <div style={{ width: 1, height: 52, background: '#E5E7EB', flexShrink: 0 }} />

          {/* 产品概览 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{
              padding: '3px 10px', borderRadius: 20,
              fontSize: 11, fontWeight: 700,
              background: isMulti ? '#FEF3C7' : '#DCFCE7',
              color: isMulti ? '#92400E' : '#166534',
            }}>
              {isMulti ? '多件' : '单件'}
            </span>
            <span style={{
              padding: '3px 10px', borderRadius: 20,
              fontSize: 11, fontWeight: 700,
              background: isMultiFace ? '#EDE9FE' : '#E0F2FE',
              color: isMultiFace ? '#5B21B6' : '#0369A1',
            }}>
              {isMultiFace ? `多面 (${positions.length}面)` : '单面'}
            </span>
            <MetaItem label="产品" value={firstItem?.productName || '—'} />
            <MetaItem label="颜色" value={firstItem?.color || '—'} />
            <MetaItem label="尺码" value={firstItem?.size || '—'} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>数量</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#111', lineHeight: 1 }}>×{totalQty}</span>
            </div>
          </div>
        </div>

        {/* 图稿区 — 图片以原始像素展示 */}
        {positions.length === 0 ? (
          <div style={{
            padding: '24px', textAlign: 'center',
            color: '#9CA3AF', fontSize: 14,
            border: '1px dashed #D1D5DB', borderRadius: 6,
          }}>
            无印刷位置信息（设计审核同步时未导出图稿）
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
            {positions.map((pos: any, idx: number) => {
              const label = POSITION_LABELS[pos.position] ?? pos.position;
              const wIn: number | null = pos.widthIn ?? pos.widthCm ?? null;
              const hIn: number | null = pos.heightIn ?? pos.heightCm ?? null;
              const hasMockup = pos.mockupImageUrl && pos.mockupImageUrl !== pos.artworkImageUrl;

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    {/* 效果图（带底图），仅当与图稿不同时显示 */}
                    {hasMockup && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
                          <img
                            src={pos.mockupImageUrl}
                            alt={`${label} 效果图`}
                            style={{
                              display: 'block',
                              width: 120, height: 120,
                              objectFit: 'contain',
                              border: '1px solid #E5E7EB',
                              borderRadius: 4,
                              background: '#F9FAFB',
                            }}
                          />
                          <div style={{
                            position: 'absolute', top: 4, left: 4,
                            width: 20, height: 20,
                            background: 'rgba(0,0,0,0.65)', color: '#fff',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700,
                          }}>
                            {idx + 1}
                          </div>
                        </div>
                        <span style={{ fontSize: 9, color: '#9CA3AF' }}>效果图</span>
                      </div>
                    )}

                    {/* 图稿：原始像素，不缩放（印刷文件） */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
                        {pos.artworkImageUrl ? (
                          <img
                            src={pos.artworkImageUrl}
                            alt={label}
                            style={{
                              display: 'block',
                              maxWidth: 'none',
                              border: '1px dashed #9CA3AF',
                            }}
                          />
                        ) : (
                          <div style={{
                            width: 200, height: 200,
                            background: `repeating-conic-gradient(#E5E7EB 0% 25%, transparent 0% 50%) 0 0 / 12px 12px`,
                            border: '1px dashed #9CA3AF',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, color: '#9CA3AF',
                          }}>无图稿</div>
                        )}

                        {/* 序号角标（仅当没有单独效果图时显示） */}
                        {!hasMockup && (
                          <div style={{
                            position: 'absolute', top: 6, left: 6,
                            width: 22, height: 22,
                            background: 'rgba(0,0,0,0.7)', color: '#fff',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700,
                          }}>
                            {idx + 1}
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: 9, color: '#9CA3AF' }}>印刷图稿</span>
                    </div>
                  </div>

                  {/* 位置标签 */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', paddingLeft: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{label}</span>
                    {wIn && hIn
                      ? <span style={{ fontSize: 11, color: '#6B7280' }}>{wIn} × {hIn} in</span>
                      : null}
                    {pos.printType
                      ? <span style={{ fontSize: 10, color: '#9CA3AF', letterSpacing: '.04em' }}>{pos.printType}</span>
                      : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      <style>{`
        @media print {
          @page { margin: 0; size: auto; }
          * { visibility: hidden !important; }
          #gang-sheet-print,
          #gang-sheet-print * { visibility: visible !important; }
          #gang-sheet-print {
            position: fixed;
            left: 0; top: 0;
            border: none !important;
            border-radius: 0 !important;
            padding: 8mm !important;
          }
        }
      `}</style>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, color: '#9CA3AF' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{value}</span>
    </div>
  );
}
