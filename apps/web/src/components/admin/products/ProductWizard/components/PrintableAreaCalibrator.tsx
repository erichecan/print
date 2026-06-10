'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';

const CANVAS_W = 1200;
const CANVAS_H = 1440;

export type CalibView = 'front' | 'back' | 'left-sleeve' | 'right-sleeve';

export interface AreaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  imageUrls: { front?: string; back?: string; 'left-sleeve'?: string; 'right-sleeve'?: string };
  areas: { front?: AreaRect; back?: AreaRect; 'left-sleeve'?: AreaRect; 'right-sleeve'?: AreaRect };
  onChange: (view: CalibView, area: AreaRect) => void;
  imageScale?: number;
}

type Handle = 'move';

const VIEW_LABELS: Record<CalibView, string> = {
  front: '正面',
  back: '背面',
  'left-sleeve': '左袖',
  'right-sleeve': '右袖',
};

const DEFAULT_AREAS: Record<CalibView, AreaRect> = {
  front:         { x: 327, y: 240, width: 546, height: 960 },
  back:          { x: 327, y: 240, width: 546, height: 960 },
  'left-sleeve': { x: 350, y: 470, width: 500, height: 500 },
  'right-sleeve':{ x: 350, y: 470, width: 500, height: 500 },
};

export function PrintableAreaCalibrator({ imageUrls, areas, onChange, imageScale = 1 }: Props) {
  const [activeView, setActiveView] = useState<CalibView>('front');
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(560);

  // Show sleeve tabs together if at least one sleeve image exists
  const hasSleeveImage = !!(imageUrls['left-sleeve'] || imageUrls['right-sleeve']);
  const visibleViews: CalibView[] = [
    ...(imageUrls.front  || true  ? ['front']  as CalibView[] : []),
    ...(imageUrls.back             ? ['back']   as CalibView[] : []),
    ...(hasSleeveImage             ? ['left-sleeve', 'right-sleeve'] as CalibView[] : []),
  ];
  const finalViews = visibleViews.length > 0 ? visibleViews : (['front'] as CalibView[]);

  // If active view got hidden after a product switch, reset to front
  useEffect(() => {
    if (!finalViews.includes(activeView)) setActiveView('front');
  }, [finalViews, activeView]);

  // Measure container width for scale
  useEffect(() => {
    if (!containerRef.current) return;
    setContainerWidth(containerRef.current.clientWidth || 560);
    const ro = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const scale = containerWidth / CANVAS_W;
  const displayH = Math.round(CANVAS_H * scale);

  const currentArea: AreaRect = areas[activeView] ?? DEFAULT_AREAS[activeView];

  const dispX = currentArea.x * scale;
  const dispY = currentArea.y * scale;
  const dispW = currentArea.width * scale;
  const dispH = currentArea.height * scale;

  const dragRef = useRef<{
    handle: Handle;
    startMX: number;
    startMY: number;
    startArea: AreaRect;
  } | null>(null);

  const onHandleMouseDown = useCallback(
    (e: React.MouseEvent, handle: Handle) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        handle,
        startMX: e.clientX,
        startMY: e.clientY,
        startArea: { ...currentArea },
      };
    },
    [currentArea]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;

      const dx = (e.clientX - d.startMX) / scale;
      const dy = (e.clientY - d.startMY) / scale;
      const s = d.startArea;
      let { x, y, width, height } = s;

      x = s.x + dx;
      y = s.y + dy;
      x = Math.max(0, Math.min(CANVAS_W - width, x));
      y = Math.max(0, Math.min(CANVAS_H - height, y));

      onChange(activeView, {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      });
    };

    const onUp = () => { dragRef.current = null; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [scale, activeView, onChange]);

  const imageUrl = imageUrls[activeView];

  return (
    <div>
      {/* View selector tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {finalViews.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setActiveView(v)}
            style={{
              padding: '5px 14px',
              borderRadius: 4,
              border: '1px solid',
              borderColor: activeView === v ? '#005bd3' : '#c9cccf',
              background: activeView === v ? '#005bd3' : '#fff',
              color: activeView === v ? '#fff' : '#202223',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      {/* Image + overlay canvas */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: displayH,
          background: '#e8e8e8',
          borderRadius: 6,
          border: '1px solid #c9cccf',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="product preview"
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              transform: imageScale !== 1 ? `scale(${imageScale})` : undefined,
              transformOrigin: 'center center',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8c9196',
              fontSize: 13,
            }}
          >
            此视图暂无图片 — 仍可调整坐标
          </div>
        )}

        {/* Printable area overlay box */}
        <div
          onMouseDown={(e) => onHandleMouseDown(e, 'move')}
          style={{
            position: 'absolute',
            left: dispX,
            top: dispY,
            width: dispW,
            height: dispH,
            border: '2px solid #005bd3',
            background: 'rgba(0, 91, 211, 0.10)',
            cursor: 'move',
            boxSizing: 'border-box',
          }}
        >
          {/* Live coords badge */}
          <div
            style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              background: 'rgba(0,0,0,0.55)',
              color: '#fff',
              fontSize: 10,
              fontFamily: 'monospace',
              padding: '2px 5px',
              borderRadius: 3,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            ({currentArea.x}, {currentArea.y}) {currentArea.width}×{currentArea.height}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#6d7175', margin: '6px 0 0' }}>
        拖动蓝框移动位置（尺寸已锁定，仅可移动）· 坐标基于 1200×1440 画布
      </p>
    </div>
  );
}
