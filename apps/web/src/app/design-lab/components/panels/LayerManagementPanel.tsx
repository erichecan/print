/**
 * Layer Management Panel - 图层管理面板
 * [2025-12-06] 实现图层管理功能，对齐 Custom Ink
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { fabric } from 'fabric';

interface LayerItem {
  id: string;
  name: string;
  type: 'text' | 'image' | 'art' | 'other';
  visible: boolean;
  locked: boolean;
  object: fabric.Object;
}

interface LayerManagementPanelProps {
  canvas: fabric.Canvas | null;
  onSelectLayer?: (object: fabric.Object) => void;
  onUpdate?: () => void;
}

const LayerManagementPanel: React.FC<LayerManagementPanelProps> = ({
  canvas,
  onSelectLayer,
  onUpdate
}) => {
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);

  // 获取图层类型图标
  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'text':
        return 'T';
      case 'image':
        return '🖼';
      case 'art':
        return '🎨';
      default:
        return '●';
    }
  };

  // 获取图层名称
  const getLayerName = (obj: fabric.Object): string => {
    if (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text') {
      const textObj = obj as fabric.IText;
      return textObj.text?.substring(0, 20) || 'Text';
    }
    if (obj.type === 'image') {
      return (obj as any).name || 'Image';
    }
    return obj.type || 'Object';
  };

  // 更新图层列表
  const updateLayers = useCallback(() => {
    if (!canvas) {
      setLayers([]);
      return;
    }

    const objects = canvas.getObjects().filter((obj: fabric.Object) => {
      // 排除背景图片
      return (obj as any).name !== 'background';
    });

    const layerItems: LayerItem[] = objects.map((obj: fabric.Object, index: number) => {
      let type: 'text' | 'image' | 'art' | 'other' = 'other';
      if (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text') {
        type = 'text';
      } else if (obj.type === 'image') {
        // [2025-12-06 12:00:00] 根据对象名称判断是 art 还是 image
        const objName = (obj as any).name || '';
        if (objName.startsWith('art_')) {
          type = 'art';
        } else {
          type = 'image';
        }
      }

      // [2025-12-06 12:00:00] 为对象添加唯一 ID（如果还没有）
      if (!(obj as any).id) {
        (obj as any).id = `layer-${Date.now()}-${index}`;
      }

      return {
        id: (obj as any).id || `layer-${index}`,
        name: getLayerName(obj),
        type,
        visible: obj.visible !== false,
        locked: obj.selectable === false,
        object: obj
      };
    });

    // 反转顺序，使最上层的图层在列表顶部显示
    setLayers(layerItems.reverse());
  }, [canvas]);

  // 监听画布变化
  useEffect(() => {
    if (!canvas) return;

    // 初始更新
    updateLayers();

    // 监听对象添加/删除/修改
    const handleObjectAdded = () => {
      updateLayers();
    };

    const handleObjectRemoved = () => {
      updateLayers();
    };

    const handleObjectModified = () => {
      updateLayers();
    };

    const handleSelectionCreated = () => {
      updateLayers();
    };

    const handleSelectionUpdated = () => {
      updateLayers();
    };

    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:removed', handleObjectRemoved);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('selection:created', handleSelectionCreated);
    canvas.on('selection:updated', handleSelectionUpdated);

    return () => {
      canvas.off('object:added', handleObjectAdded);
      canvas.off('object:removed', handleObjectRemoved);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('selection:created', handleSelectionCreated);
      canvas.off('selection:updated', handleSelectionUpdated);
    };
  }, [canvas, updateLayers]);

  // 选择图层
  const handleLayerSelect = (layer: LayerItem) => {
    if (!canvas || layer.locked) return;

    canvas.setActiveObject(layer.object);
    canvas.renderAll();
    onSelectLayer?.(layer.object);
    onUpdate?.();
  };

  // 切换可见性
  const handleToggleVisibility = (layer: LayerItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canvas) return;

    const newVisible = !layer.visible;
    layer.object.set('visible', newVisible);
    canvas.renderAll();
    updateLayers();
    onUpdate?.();
  };

  // 切换锁定
  const handleToggleLock = (layer: LayerItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canvas) return;

    const newLocked = !layer.locked;
    layer.object.set({
      selectable: !newLocked,
      evented: !newLocked
    });
    canvas.renderAll();
    updateLayers();
    onUpdate?.();
  };

  // 删除图层
  const handleDeleteLayer = (layer: LayerItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canvas) return;

    if (confirm(`Delete "${layer.name}"?`)) {
      canvas.remove(layer.object);
      canvas.renderAll();
      updateLayers();
      onUpdate?.();
    }
  };

  // 拖拽开始
  const handleDragStart = (layerId: string, e: React.DragEvent) => {
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 拖拽结束
  const handleDragEnd = () => {
    setDraggedLayerId(null);
  };

  // 拖拽悬停
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // 拖拽放置
  const handleDrop = (targetLayerId: string, e: React.DragEvent) => {
    e.preventDefault();
    if (!canvas || !draggedLayerId || draggedLayerId === targetLayerId) return;

    const draggedLayer = layers.find(l => l.id === draggedLayerId);
    const targetLayer = layers.find(l => l.id === targetLayerId);

    if (!draggedLayer || !targetLayer) return;

    // 获取当前 z-index
    const draggedIndex = canvas.getObjects().indexOf(draggedLayer.object);
    const targetIndex = canvas.getObjects().indexOf(targetLayer.object);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // 移动对象
    if (draggedIndex < targetIndex) {
      // 向下移动
      canvas.sendToBack(draggedLayer.object);
      for (let i = 0; i < targetIndex - draggedIndex; i++) {
        canvas.bringForward(draggedLayer.object);
      }
    } else {
      // 向上移动
      canvas.bringToFront(draggedLayer.object);
      for (let i = 0; i < draggedIndex - targetIndex; i++) {
        canvas.sendBackwards(draggedLayer.object);
      }
    }

    canvas.renderAll();
    updateLayers();
    onUpdate?.();
  };

  return (
    <div className="dl-layer-management-panel">
      <div className="dl-layer-management-panel__header">
        <h3 className="dl-layer-management-panel__title">Layers</h3>
        <span className="dl-layer-management-panel__count">{layers.length}</span>
      </div>

      <div className="dl-layer-management-panel__list">
        {layers.length === 0 ? (
          <div className="dl-layer-management-panel__empty">
            <p>No layers yet</p>
            <p className="dl-layer-management-panel__empty-hint">
              Add text, images, or art to create layers
            </p>
          </div>
        ) : (
          layers.map((layer) => {
            const isSelected = canvas?.getActiveObject() === layer.object;
            const isDragging = draggedLayerId === layer.id;

            return (
              <div
                key={layer.id}
                className={`dl-layer-management-panel__item ${isSelected ? 'is-selected' : ''} ${isDragging ? 'is-dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(layer.id, e)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(layer.id, e)}
                onClick={() => handleLayerSelect(layer)}
              >
                <div className="dl-layer-management-panel__item-content">
                  <span className="dl-layer-management-panel__item-icon">
                    {getLayerIcon(layer.type)}
                  </span>
                  <span className="dl-layer-management-panel__item-name" title={layer.name}>
                    {layer.name}
                  </span>
                </div>

                <div className="dl-layer-management-panel__item-controls">
                  <button
                    className={`dl-layer-management-panel__control-btn ${layer.visible ? 'is-visible' : ''}`}
                    onClick={(e) => handleToggleVisibility(layer, e)}
                    title={layer.visible ? 'Hide' : 'Show'}
                    type="button"
                  >
                    {layer.visible ? '👁' : '👁‍🗨'}
                  </button>
                  <button
                    className={`dl-layer-management-panel__control-btn ${layer.locked ? 'is-locked' : ''}`}
                    onClick={(e) => handleToggleLock(layer, e)}
                    title={layer.locked ? 'Unlock' : 'Lock'}
                    type="button"
                  >
                    {layer.locked ? '🔒' : '🔓'}
                  </button>
                  <button
                    className="dl-layer-management-panel__control-btn"
                    onClick={(e) => handleDeleteLayer(layer, e)}
                    title="Delete"
                    type="button"
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LayerManagementPanel;

