import React, { useEffect, useState, useRef, useCallback } from 'react';
import type * as fabric from 'fabric';

interface FloatingObjectControlsProps {
    canvas: fabric.Canvas | null;
    fabricModule: any;
}

interface ControlButtonProps {
    icon: React.ReactNode;
    onClick?: () => void;
    onMouseDown?: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
    title?: string;
    cursor?: string;
}

const ControlButton: React.FC<ControlButtonProps> = ({ icon, onClick, onMouseDown, style, title, cursor }) => (
    <div
        style={{
            position: 'absolute',
            width: '24px',
            height: '24px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: cursor || 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 100, // Ensure it's above canvas
            pointerEvents: 'auto',
            ...style,
        }}
        onClick={(e) => {
            e.stopPropagation();
            onClick?.();
        }}
        onMouseDown={(e) => {
            // Prevent default to avoid canvas deselecting object
            e.stopPropagation();
            onMouseDown?.(e);
        }}
        title={title}
    >
        {icon}
    </div>
);

export const FloatingObjectControls: React.FC<FloatingObjectControlsProps> = ({ canvas, fabricModule }) => {
    const [activeObject, setActiveObject] = useState<fabric.Object | null>(null);
    const [coords, setCoords] = useState<{ tl: { x: number, y: number }; tr: { x: number, y: number }; bl: { x: number, y: number }; br: { x: number, y: number } } | null>(null);

    const activeObjectRef = useRef<fabric.Object | null>(null);

    // Update coordinates
    const updateCoords = useCallback(() => {
        if (!canvas || !activeObjectRef.current || !fabricModule) {
            setCoords(null);
            return;
        }
        const obj = activeObjectRef.current;

        // transformPoint is likely in fabricModule.util or fabricModule directly depending on v5/v6 packaging
        // In v6, it is often fabric.util.transformPoint
        const util = fabricModule.util || fabricModule;
        if (!util || !util.transformPoint) return;

        const objCoords = obj.getCoords();

        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const canvasEl = canvas.getElement();

        const logicalWidth = canvas.getWidth();
        const logicalHeight = canvas.getHeight();
        const cssWidth = canvasEl.clientWidth;
        const cssHeight = canvasEl.clientHeight;

        const scaleX = logicalWidth > 0 ? cssWidth / logicalWidth : 1;
        const scaleY = logicalHeight > 0 ? cssHeight / logicalHeight : 1;

        const transformToCss = (point: fabric.Point) => {
            const p = util.transformPoint(point, vpt);
            return {
                x: p.x * scaleX,
                y: p.y * scaleY
            };
        };

        const tl = transformToCss(objCoords[0]);
        const tr = transformToCss(objCoords[1]);
        const br = transformToCss(objCoords[2]);
        const bl = transformToCss(objCoords[3]);

        setCoords({ tl, tr, br, bl });
    }, [canvas, fabricModule]);

    useEffect(() => {
        if (!canvas) return;

        const handleSelection = (e: any) => {
            const selected = e.selected?.[0] || canvas.getActiveObject();

            if (selected && (
                selected.name === 'background' ||
                selected.name?.startsWith('product-image-') ||
                (selected.data as any)?.layerType === 'product'
            )) {
                setActiveObject(null);
                activeObjectRef.current = null;
                setCoords(null);
                return;
            }

            if (selected) {
                selected.hasControls = false;
                selected.hasBorders = true;

                setActiveObject(selected);
                activeObjectRef.current = selected;
                updateCoords();
            } else {
                setActiveObject(null);
                activeObjectRef.current = null;
                setCoords(null);
            }
        };

        const handleClear = () => {
            setActiveObject(null);
            activeObjectRef.current = null;
            setCoords(null);
        };

        const handleTransform = () => {
            requestAnimationFrame(updateCoords);
        };

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', handleClear);
        canvas.on('object:moving', handleTransform);
        canvas.on('object:scaling', handleTransform);
        canvas.on('object:rotating', handleTransform);
        canvas.on('object:modified', handleTransform);
        canvas.on('mouse:wheel', handleTransform);
        canvas.on('after:render', updateCoords);

        if (canvas.getActiveObject()) {
            handleSelection({ selected: [canvas.getActiveObject()] });
        }

        return () => {
            canvas.off('selection:created', handleSelection);
            canvas.off('selection:updated', handleSelection);
            canvas.off('selection:cleared', handleClear);
            canvas.off('object:moving', handleTransform);
            canvas.off('object:scaling', handleTransform);
            canvas.off('object:rotating', handleTransform);
            canvas.off('object:modified', handleTransform);
            canvas.off('mouse:wheel', handleTransform);
            canvas.off('after:render', updateCoords);
        };
    }, [canvas, updateCoords]);

    // [2025-12-31] Handle window resize to keep controls pinned
    useEffect(() => {
        const handleResize = () => {
            requestAnimationFrame(updateCoords);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [updateCoords]);

    // Actions
    const handleDelete = () => {
        if (activeObject && canvas) {
            canvas.remove(activeObject);
            canvas.discardActiveObject();
            canvas.renderAll();
        }
    };

    const handleCopy = () => {
        if (activeObject && canvas) {
            activeObject.clone().then((cloned: fabric.Object) => {
                if (!cloned) return;
                cloned.set({
                    left: (activeObject.left || 0) + 100,
                    top: (activeObject.top || 0) + 100,
                    evented: true,
                    hasControls: false,
                    hasBorders: true,
                });

                if (cloned.type === 'activeSelection' || cloned.type === 'group') {
                    cloned.canvas = canvas;
                    if ((cloned as any).forEachObject) {
                        (cloned as any).forEachObject((obj: fabric.Object) => {
                            canvas.add(obj);
                        });
                    }
                    cloned.setCoords();
                } else {
                    canvas.add(cloned);
                }

                canvas.setActiveObject(cloned);
                canvas.requestRenderAll();
            });
        }
    };

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        if (!activeObject || !canvas || !fabricModule) return;

        e.preventDefault();
        e.stopPropagation();

        const util = fabricModule.util || fabricModule;
        if (!util || !util.transformPoint) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const initialScaleX = activeObject.scaleX || 1;
        const initialScaleY = activeObject.scaleY || 1;

        const center = activeObject.getCenterPoint();
        const canvasRect = canvas.getElement().getBoundingClientRect();
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];

        const logicalWidth = canvas.getWidth();
        const logicalHeight = canvas.getHeight();
        const cssScaleX = logicalWidth > 0 ? canvasRect.width / logicalWidth : 1;
        const cssScaleY = logicalHeight > 0 ? canvasRect.height / logicalHeight : 1;

        const centerP = util.transformPoint(center, vpt);
        const centerX = canvasRect.left + (centerP.x * cssScaleX);
        const centerY = canvasRect.top + (centerP.y * cssScaleY);

        const startDist = Math.hypot(startX - centerX, startY - centerY);

        const onMouseMove = (moveEvent: MouseEvent) => {
            moveEvent.preventDefault();
            const curDist = Math.hypot(moveEvent.clientX - centerX, moveEvent.clientY - centerY);

            if (startDist < 1) return;

            const ratio = curDist / startDist;

            const newScaleX = initialScaleX * ratio;
            const newScaleY = initialScaleY * ratio;

            activeObject.set({
                scaleX: newScaleX,
                scaleY: newScaleY
            });

            canvas.requestRenderAll();
            canvas.fire('object:scaling', { target: activeObject } as any);
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            canvas.fire('object:modified', { target: activeObject } as any);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    if (!activeObject || !coords) return null;

    const trashIcon = (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
    );

    const copyIcon = (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
    );

    const resizeIcon = (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
        </svg>
    );

    const OFFSET = 15;
    const SIZE = 24;
    const HALF_SIZE = SIZE / 2;

    return (
        <div
            className="dl-floating-controls-overlay"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                overflow: 'hidden',
                zIndex: 100
            }}
        >
            <ControlButton
                icon={trashIcon}
                onClick={handleDelete}
                title="Delete"
                style={{
                    left: coords.tl.x - HALF_SIZE - OFFSET,
                    top: coords.tl.y - HALF_SIZE - OFFSET,
                }}
            />
            <ControlButton
                icon={copyIcon}
                onClick={handleCopy}
                title="Duplicate"
                style={{
                    left: coords.tr.x - HALF_SIZE + OFFSET,
                    top: coords.tr.y - HALF_SIZE - OFFSET,
                }}
            />
            <ControlButton
                icon={resizeIcon}
                onMouseDown={handleResizeMouseDown}
                title="Resize"
                cursor="nwse-resize"
                style={{
                    left: coords.br.x - HALF_SIZE + OFFSET,
                    top: coords.br.y - HALF_SIZE + OFFSET,
                }}
            />
        </div>
    );
};
