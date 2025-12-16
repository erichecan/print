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
  groupId?: string; // [2025-12-06 13:00:00] 图层分组 ID
}

interface LayerGroup {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  layerIds: string[];
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
  const [groups, setGroups] = useState<LayerGroup[]>([]);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set()); // [2025-12-06 13:00:00] 展开的分组

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
      const objName = (obj as any).name || '';
      // [2025-01-30 23:30:00] 排除背景图片和产品主图（产品主图不显示在图层列表中）
      return objName !== 'background' && !objName.startsWith('product-image-');
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
        object: obj,
        groupId: (obj as any).groupId || undefined // [2025-12-06 13:00:00] 图层分组 ID
      };
    });

    // 反转顺序，使最上层的图层在列表顶部显示
    setLayers(layerItems.reverse());
  }, [canvas]);

  // [2025-01-30 23:25:00] 监听画布变化
  useEffect(() => {
    if (!canvas) return;

    // 初始更新
    updateLayers();

    // [2025-01-30 23:25:00] 监听对象添加/删除/修改
    const handleObjectAdded = () => {
      console.log('[LayerManagementPanel] Object added, updating layers');
      updateLayers();
    };

    const handleObjectRemoved = () => {
      console.log('[LayerManagementPanel] Object removed, updating layers');
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

    // [2025-01-30 23:25:00] 监听渲染完成事件，确保图层列表在对象渲染后更新
    const handleAfterRender = () => {
      updateLayers();
    };

    canvas.on('object:added', handleObjectAdded);
    canvas.on('object:removed', handleObjectRemoved);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('selection:created', handleSelectionCreated);
    canvas.on('selection:updated', handleSelectionUpdated);
    canvas.on('after:render', handleAfterRender);

    return () => {
      canvas.off('object:added', handleObjectAdded);
      canvas.off('object:removed', handleObjectRemoved);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('selection:created', handleSelectionCreated);
      canvas.off('selection:updated', handleSelectionUpdated);
      canvas.off('after:render', handleAfterRender);
    };
  }, [canvas, updateLayers]);
  
  // [2025-01-30 23:25:00] 监听 onUpdate 回调（当画布状态变化时触发）
  useEffect(() => {
    if (onUpdate && canvas) {
      // 当 onUpdate 被调用时，也更新图层列表
      updateLayers();
    }
  }, [onUpdate, canvas, updateLayers]);

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

  // [2025-12-08] 重命名图层
  const handleRenameLayer = (layer: LayerItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canvas) return;

    const newName = prompt('Enter new layer name:', layer.name);
    if (newName && newName.trim() && newName !== layer.name) {
      // 更新对象的name属性
      (layer.object as any).name = newName.trim();
      // 如果是文本对象，也更新文本内容（如果名称来自文本内容）
      if (layer.object.type === 'i-text' || layer.object.type === 'textbox' || layer.object.type === 'text') {
        const textObj = layer.object as fabric.IText;
        // 只有当名称来自文本内容时才更新文本
        if (textObj.text === layer.name) {
          textObj.set('text', newName.trim());
        }
      }
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

    // [2025-12-16 04:10:00] 移动对象 - 修复 Fabric.js v6 API
    // [2025-12-16 04:15:00] 限制：不能将对象移到商品底图（background/product-image）下面
    try {
      const objects = canvas.getObjects();
      
      // 找到商品底图的位置（name === 'background' 或 name.startsWith('product-image-') 或 layerType === 'product'/'product-image'）
      const backgroundIndex = objects.findIndex((obj: any) => {
        const name = (obj as any).name || '';
        const layerType = (obj as any).data?.layerType;
        return name === 'background' || name.startsWith('product-image-') || layerType === 'product' || layerType === 'product-image';
      });
      
      // 计算实际的目标索引：确保不在商品底图之后
      // 如果目标索引在商品底图之后，调整为商品底图之后（backgroundIndex + 1）
      const minAllowedIndex = backgroundIndex >= 0 ? backgroundIndex + 1 : 0;
      const actualTargetIndex = Math.max(targetIndex, minAllowedIndex);
      
      if (draggedIndex < actualTargetIndex) {
        // 向下移动（但仍然在商品底图之后）
        // 使用手动移动，确保不会移到商品底图下面
        const obj = draggedLayer.object;
        const currentIdx = objects.indexOf(obj);
        if (currentIdx >= 0 && currentIdx !== actualTargetIndex) {
          objects.splice(currentIdx, 1);
          objects.splice(actualTargetIndex, 0, obj);
        }
      } else {
        // 向上移动
        const obj = draggedLayer.object;
        const currentIdx = objects.indexOf(obj);
        if (currentIdx >= 0 && currentIdx !== actualTargetIndex) {
          objects.splice(currentIdx, 1);
          objects.splice(actualTargetIndex, 0, obj);
        }
      }
    } catch (error) {
      console.error('[LayerManagementPanel] Layer move failed:', error);
    }

    canvas.renderAll();
    updateLayers();
    onUpdate?.();
  };

  // [2025-12-06 13:00:00] 创建图层分组
  const handleCreateGroup = () => {
    if (!canvas) return;

    const selectedObjects = canvas.getActiveObjects();
    if (selectedObjects.length < 2) {
      alert('Please select at least 2 layers to create a group');
      return;
    }

    const groupId = `group-${Date.now()}`;
    const groupName = prompt('Enter group name:', `Group ${groups.length + 1}`) || `Group ${groups.length + 1}`;

    // 为选中的对象设置 groupId
    selectedObjects.forEach((obj) => {
      (obj as any).groupId = groupId;
    });

    // 创建分组
    const newGroup: LayerGroup = {
      id: groupId,
      name: groupName,
      visible: true,
      locked: false,
      layerIds: selectedObjects.map((obj) => (obj as any).id || `layer-${Date.now()}`)
    };

    setGroups([...groups, newGroup]);
    setExpandedGroups(new Set([...expandedGroups, groupId]));
    updateLayers();
    onUpdate?.();
  };

  // [2025-12-06 13:00:00] 取消分组
  const handleUngroup = (groupId: string) => {
    if (!canvas) return;

    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    // 移除所有图层的分组 ID
    group.layerIds.forEach((layerId) => {
      const layer = layers.find(l => l.id === layerId);
      if (layer) {
        delete (layer.object as any).groupId;
      }
    });

    setGroups(groups.filter(g => g.id !== groupId));
    updateLayers();
    onUpdate?.();
  };

  // [2025-12-06 13:00:00] 切换分组展开/折叠
  const handleToggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // [2025-12-06 13:00:00] 切换分组可见性
  const handleToggleGroupVisibility = (group: LayerGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canvas) return;

    const newVisible = !group.visible;
    group.layerIds.forEach((layerId) => {
      const layer = layers.find(l => l.id === layerId);
      if (layer) {
        layer.object.set('visible', newVisible);
      }
    });

    setGroups(groups.map(g => g.id === group.id ? { ...g, visible: newVisible } : g));
    canvas.renderAll();
    updateLayers();
    onUpdate?.();
  };

  // [2025-12-06 13:00:00] 切换分组锁定
  const handleToggleGroupLock = (group: LayerGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canvas) return;

    const newLocked = !group.locked;
    group.layerIds.forEach((layerId) => {
      const layer = layers.find(l => l.id === layerId);
      if (layer) {
        layer.object.set({
          selectable: !newLocked,
          evented: !newLocked
        });
      }
    });

    setGroups(groups.map(g => g.id === group.id ? { ...g, locked: newLocked } : g));
    canvas.renderAll();
    updateLayers();
    onUpdate?.();
  };

  // [2025-12-06 13:00:00] 获取分组中的图层
  const getGroupLayers = (groupId: string): LayerItem[] => {
    return layers.filter(layer => layer.groupId === groupId);
  };

  // [2025-12-06 13:00:00] 获取未分组的图层
  const getUngroupedLayers = (): LayerItem[] => {
    return layers.filter(layer => !layer.groupId);
  };

  return (
    <div className="dl-layer-management-panel">
      <div className="dl-layer-management-panel__header">
        <h3 className="dl-layer-management-panel__title">Layers</h3>
        <span className="dl-layer-management-panel__count">{layers.length}</span>
        <button
          className="dl-layer-management-panel__group-btn"
          onClick={handleCreateGroup}
          title="Create Group (Select 2+ layers first)"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Group
        </button>
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
          <>
            {/* [2025-12-06 13:00:00] 渲染分组 */}
            {groups.map((group) => {
              const groupLayers = getGroupLayers(group.id);
              const isExpanded = expandedGroups.has(group.id);

              return (
                <div key={group.id} className="dl-layer-management-panel__group">
                  <div
                    className="dl-layer-management-panel__group-header"
                    onClick={() => handleToggleGroup(group.id)}
                  >
                    <button
                      className="dl-layer-management-panel__group-toggle"
                      type="button"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                    <span className="dl-layer-management-panel__group-name">{group.name}</span>
                    <span className="dl-layer-management-panel__group-count">({groupLayers.length})</span>
                    <div className="dl-layer-management-panel__group-controls">
                      <button
                        className={`dl-layer-management-panel__control-btn ${group.visible ? 'is-visible' : ''}`}
                        onClick={(e) => handleToggleGroupVisibility(group, e)}
                        title={group.visible ? 'Hide Group' : 'Show Group'}
                        type="button"
                      >
                        {group.visible ? '👁' : '👁‍🗨'}
                      </button>
                      <button
                        className={`dl-layer-management-panel__control-btn ${group.locked ? 'is-locked' : ''}`}
                        onClick={(e) => handleToggleGroupLock(group, e)}
                        title={group.locked ? 'Unlock Group' : 'Lock Group'}
                        type="button"
                      >
                        {group.locked ? '🔒' : '🔓'}
                      </button>
                      <button
                        className="dl-layer-management-panel__control-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUngroup(group.id);
                        }}
                        title="Ungroup"
                        type="button"
                      >
                        ↶
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="dl-layer-management-panel__group-layers">
                      {groupLayers.map((layer) => {
                        const isSelected = canvas?.getActiveObject() === layer.object;
                        const isDragging = draggedLayerId === layer.id;

                        return (
                          <div
                            key={layer.id}
                            className={`dl-layer-management-panel__item dl-layer-management-panel__item--nested ${isSelected ? 'is-selected' : ''} ${isDragging ? 'is-dragging' : ''}`}
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
                    onClick={(e) => handleRenameLayer(layer, e)}
                    title="Rename"
                    type="button"
                  >
                    ✏️
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
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* [2025-12-06 13:00:00] 渲染未分组的图层 */}
            {getUngroupedLayers().map((layer) => {
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
                    onClick={(e) => handleRenameLayer(layer, e)}
                    title="Rename"
                    type="button"
                  >
                    ✏️
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
          })}
          </>
        )}
      </div>
    </div>
  );
};

export default LayerManagementPanel;

