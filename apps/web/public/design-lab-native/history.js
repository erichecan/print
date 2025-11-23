/**
 * History - 撤销重做系统
 * [2025-11-19 10:25:00] 管理画布历史状态，支持撤销/重做，每个面独立历史栈
 */
(function() {
  'use strict';

  const MAX_HISTORY = 50;
  const historyStacks = {
    front: [],
    back: [],
    sleeve: []
  };
  const futureStacks = {
    front: [],
    back: [],
    sleeve: []
  };
  let currentSide = 'front';
  let isSaving = false;

  // [2025-11-19 10:25:00] 保存当前状态
  // [2025-01-28 04:55:00] 添加详细日志用于调试
  function saveState() {
    const timestamp = new Date().toISOString();
    console.log('[History] ===== saveState CALLED =====', {
      timestamp,
      isSaving,
      currentSide,
      historyStackLength: historyStacks[currentSide]?.length || 0
    });

    if (isSaving) {
      console.log('[History] ⚠️ Already saving, skipping...', { timestamp });
      return;
    }
    
    const canvas = window.DesignLabCanvas ? window.DesignLabCanvas.getCanvas() : null;
    if (!canvas) {
      console.warn('[History] ❌ Canvas not available', {
        hasDesignLabCanvas: !!window.DesignLabCanvas,
        hasGetCanvas: !!(window.DesignLabCanvas && window.DesignLabCanvas.getCanvas),
        timestamp
      });
      return;
    }

    isSaving = true;
    
    // [2025-11-19 10:25:00] 获取当前画布状态（排除背景）
    const allObjects = canvas.getObjects();
    const objects = allObjects.filter(obj => obj.name !== 'background');
    
    console.log('[History] 📋 Getting canvas state:', {
      totalObjects: allObjects.length,
      objectsExcludingBackground: objects.length,
      backgroundObjects: allObjects.length - objects.length,
      timestamp
    });

    const state = canvas.toDatalessJSON(objects);
    const stateSize = JSON.stringify(state).length;
    
    console.log('[History] 📋 State serialized:', {
      stateSize: `${(stateSize / 1024).toFixed(2)}KB`,
      statePreview: JSON.stringify(state).substring(0, 100) + '...',
      timestamp
    });
    
    // [2025-11-19 10:25:00] 添加到历史栈
    const beforeLength = historyStacks[currentSide].length;
    historyStacks[currentSide].push(state);
    const afterLength = historyStacks[currentSide].length;
    
    console.log('[History] ✅ State saved to history stack:', {
      side: currentSide,
      beforeLength,
      afterLength,
      timestamp
    });
    
    // [2025-11-19 10:25:00] 限制历史栈大小
    if (historyStacks[currentSide].length > MAX_HISTORY) {
      const removed = historyStacks[currentSide].shift();
      console.log('[History] 📋 History stack trimmed (max:', MAX_HISTORY, ')', {
        removed: !!removed,
        currentLength: historyStacks[currentSide].length,
        timestamp
      });
    }
    
    // [2025-11-19 10:25:00] 清空未来栈
    const futureLengthBefore = futureStacks[currentSide].length;
    futureStacks[currentSide] = [];
    
    if (futureLengthBefore > 0) {
      console.log('[History] 📋 Future stack cleared:', {
        side: currentSide,
        clearedItems: futureLengthBefore,
        timestamp
      });
    }
    
    isSaving = false;
    
    console.log('[History] ===== saveState COMPLETED =====', {
      historyStackLength: historyStacks[currentSide].length,
      futureStackLength: futureStacks[currentSide].length,
      timestamp: new Date().toISOString()
    });
  }

  // [2025-11-19 10:25:00] 撤销
  // [2025-01-28 04:55:00] 添加详细日志用于调试
  function undo() {
    const timestamp = new Date().toISOString();
    console.log('[History] ===== undo CALLED =====', {
      timestamp,
      currentSide,
      historyStackLength: historyStacks[currentSide]?.length || 0,
      futureStackLength: futureStacks[currentSide]?.length || 0,
      isSaving
    });

    const canvas = window.DesignLabCanvas ? window.DesignLabCanvas.getCanvas() : null;
    if (!canvas) {
      console.error('[History] ❌ Canvas not available for undo', {
        hasDesignLabCanvas: !!window.DesignLabCanvas,
        hasGetCanvas: !!(window.DesignLabCanvas && window.DesignLabCanvas.getCanvas),
        timestamp
      });
      return false;
    }

    const historyLength = historyStacks[currentSide]?.length || 0;
    console.log('[History] 📋 Checking history stack:', {
      side: currentSide,
      historyLength,
      canUndo: historyLength > 0,
      timestamp
    });

    if (historyLength === 0) {
      console.warn('[History] ⚠️ Cannot undo: history stack is empty', {
        side: currentSide,
        timestamp
      });
      return false;
    }

    // [2025-11-19 10:25:00] 保存当前状态到未来栈
    const allObjects = canvas.getObjects();
    const objects = allObjects.filter(obj => obj.name !== 'background');
    const currentState = canvas.toDatalessJSON(objects);
    
    console.log('[History] 📋 Saving current state to future stack:', {
      totalObjects: allObjects.length,
      objectsExcludingBackground: objects.length,
      timestamp
    });

    futureStacks[currentSide].push(currentState);
    console.log('[History] ✅ Current state saved to future stack:', {
      side: currentSide,
      futureStackLength: futureStacks[currentSide].length,
      timestamp
    });

    // [2025-11-19 10:25:00] 恢复上一个状态
    const previousState = historyStacks[currentSide].pop();
    const newHistoryLength = historyStacks[currentSide].length;
    
    console.log('[History] 📋 Popped previous state from history stack:', {
      hasPreviousState: !!previousState,
      previousStateSize: previousState ? JSON.stringify(previousState).length : 0,
      newHistoryLength,
      timestamp
    });

    if (previousState) {
      isSaving = true;
      console.log('[History] 📋 Loading previous state to canvas...', {
        statePreview: JSON.stringify(previousState).substring(0, 100) + '...',
        timestamp
      });

      // [2025-01-28 05:10:00] 在加载新状态之前，先保存背景对象
      // 方法1：从 canvasManager 的全局变量获取（最可靠）
      const backgroundFromManager = window.DesignLabCanvas && typeof window.DesignLabCanvas.getBackgroundImage === 'function' 
        ? window.DesignLabCanvas.getBackgroundImage() 
        : null;
      // 方法2：从画布中获取背景对象（备用）
      const backgroundFromCanvas = canvas.getObjects().find(obj => obj.name === 'background');
      
      // [2025-01-28 05:35:00] 优先使用 canvasManager 的全局变量，如果都没有则从画布获取
      const backgroundObject = backgroundFromManager || backgroundFromCanvas;
      
      console.log('[History] 📋 Saving background before loading state:', {
        hasBackgroundFromCanvas: !!backgroundFromCanvas,
        hasBackgroundFromManager: !!backgroundFromManager,
        hasBackgroundObject: !!backgroundObject,
        backgroundType: backgroundObject?.type,
        backgroundName: backgroundObject?.name,
        timestamp
      });
      
      // [2025-01-28 05:35:00] 如果从 manager 获取失败，但画布中有背景，尝试更新 manager
      if (!backgroundFromManager && backgroundFromCanvas && window.DesignLabCanvas && typeof window.DesignLabCanvas.setBackgroundImage === 'function') {
        window.DesignLabCanvas.setBackgroundImage(backgroundFromCanvas);
        console.log('[History] 📋 Updated manager background reference from canvas', { timestamp });
      }

      // [2025-01-28 05:10:00] 如果找到了背景对象，克隆它以便恢复（避免引用问题）
      let backgroundClone = null;
      if (backgroundObject) {
        try {
          // [2025-01-28 05:10:00] 使用 toObject() 和 fromObject() 来克隆背景对象
          const bgData = backgroundObject.toObject();
          backgroundClone = window.fabric.util.enlivenObjects([bgData], (objects) => {
            return objects[0];
          });
          // [2025-01-28 05:10:00] 如果 enlivenObjects 是异步的，我们需要在回调中处理
          // 但为了简化，我们直接使用 toObject() 保存数据，然后在 loadFromJSON 回调中恢复
        } catch (e) {
          console.warn('[History] ⚠️ Failed to clone background object:', e, { timestamp });
        }
      }

      canvas.loadFromJSON(previousState, () => {
        const loadTimestamp = new Date().toISOString();
        console.log('[History] ✅ Previous state loaded to canvas:', {
          timestamp: loadTimestamp,
          objectsCount: canvas.getObjects().length
        });

        // [2025-01-28 05:35:00] 检查画布中是否已经有背景（loadFromJSON 后）
        const existingBg = canvas.getObjects().find(obj => obj.name === 'background');
        
        if (!existingBg) {
          // [2025-01-28 05:35:00] 背景不存在，需要恢复
          console.log('[History] 📋 Background missing after loadFromJSON, restoring...', {
            timestamp: loadTimestamp,
            hasSavedBackground: !!backgroundObject
          });
          
          if (backgroundObject) {
            // [2025-01-28 05:35:00] 尝试直接添加背景对象（如果对象仍然有效）
            try {
              // [2025-01-28 05:35:00] 检查对象是否仍然有效（没有被垃圾回收）
              if (backgroundObject.canvas === null || backgroundObject.canvas === undefined) {
                // [2025-01-28 05:35:00] 对象已从画布移除，可以重新添加
                canvas.add(backgroundObject);
                
                // [2025-01-28 05:35:00] 确保背景在最底层
                try {
                  if (typeof canvas.sendToBack === 'function') {
                    canvas.sendToBack(backgroundObject);
                  } else if (typeof canvas.sendObjectToBack === 'function') {
                    canvas.sendObjectToBack(backgroundObject);
                  }
                } catch (e) {
                  console.warn('[History] ⚠️ Failed to send background to back:', e);
                }
                
                // [2025-01-28 05:35:00] 更新 canvasManager 的全局变量
                if (window.DesignLabCanvas && typeof window.DesignLabCanvas.setBackgroundImage === 'function') {
                  window.DesignLabCanvas.setBackgroundImage(backgroundObject);
                }
                
                canvas.renderAll();
                console.log('[History] ✅ Background restored directly', {
                  timestamp: loadTimestamp
                });
              } else {
                // [2025-01-28 05:35:00] 对象仍在画布上，使用 toObject() 克隆
                const bgData = backgroundObject.toObject();
                window.fabric.util.enlivenObjects([bgData], (objects) => {
                  if (objects && objects.length > 0) {
                    const restoredBg = objects[0];
                    canvas.add(restoredBg);
                    
                    try {
                      if (typeof canvas.sendToBack === 'function') {
                        canvas.sendToBack(restoredBg);
                      } else if (typeof canvas.sendObjectToBack === 'function') {
                        canvas.sendObjectToBack(restoredBg);
                      }
                    } catch (e) {
                      console.warn('[History] ⚠️ Failed to send restored background to back:', e);
                    }
                    
                    if (window.DesignLabCanvas && typeof window.DesignLabCanvas.setBackgroundImage === 'function') {
                      window.DesignLabCanvas.setBackgroundImage(restoredBg);
                    }
                    
                    canvas.renderAll();
                    console.log('[History] ✅ Background restored from cloned object', {
                      timestamp: loadTimestamp
                    });
                  }
                });
              }
            } catch (e) {
              console.error('[History] ❌ Failed to restore background:', e, {
                timestamp: loadTimestamp
              });
              
              // [2025-01-28 05:35:00] 如果恢复失败，重新加载背景
              if (window.DesignLabCanvas && typeof window.DesignLabCanvas.loadBackgroundForCurrentSide === 'function') {
                window.DesignLabCanvas.loadBackgroundForCurrentSide();
                console.log('[History] ✅ Background reloaded from canvasManager', {
                  timestamp: loadTimestamp
                });
              }
            }
          } else {
            // [2025-01-28 05:35:00] 没有保存的背景对象，重新加载
            console.warn('[History] ⚠️ No saved background, reloading from canvasManager...', {
              timestamp: loadTimestamp
            });
            
            if (window.DesignLabCanvas && typeof window.DesignLabCanvas.loadBackgroundForCurrentSide === 'function') {
              window.DesignLabCanvas.loadBackgroundForCurrentSide();
              console.log('[History] ✅ Background reloaded from canvasManager', {
                timestamp: loadTimestamp
              });
            }
          }
        } else {
          // [2025-01-28 05:35:00] 背景已存在，确保它在最底层
          console.log('[History] ✅ Background exists, ensuring it is at back', {
            timestamp: loadTimestamp
          });
          
          // [2025-01-28 05:35:00] 更新 canvasManager 的全局变量（确保同步）
          if (window.DesignLabCanvas && typeof window.DesignLabCanvas.setBackgroundImage === 'function') {
            window.DesignLabCanvas.setBackgroundImage(existingBg);
          }
        }

        canvas.renderAll();
        
        // [2025-11-22 12:55:00] 确保背景在最底层（兼容不同版本的 Fabric.js）
        const bg = canvas.getObjects().find(obj => obj.name === 'background');
        if (bg) {
          try {
            if (typeof canvas.sendToBack === 'function') {
              canvas.sendToBack(bg);
            } else if (typeof canvas.sendObjectToBack === 'function') {
              canvas.sendObjectToBack(bg);
            } else if (typeof canvas.moveTo === 'function') {
              canvas.moveTo(bg, 0);
            } else {
              // [2025-11-22 12:55:00] 如果都没有，手动移动到最底层
              const objects = canvas.getObjects();
              const index = objects.indexOf(bg);
              if (index > 0) {
                objects.splice(index, 1);
                objects.unshift(bg);
                canvas.renderAll();
              }
            }
            console.log('[History] ✅ Background sent to back', { timestamp: loadTimestamp });
          } catch (e) {
            console.warn('[History] ⚠️ Failed to send background to back:', e, { timestamp: loadTimestamp });
          }
        } else {
          console.warn('[History] ⚠️ Background not found after restore', { timestamp: loadTimestamp });
        }
        
        isSaving = false;
        
        // [2025-11-19 10:25:00] 更新图层面板
        if (window.DesignLabLayers) {
          window.DesignLabLayers.updateLayers();
          console.log('[History] ✅ Layers panel updated', { timestamp: loadTimestamp });
        } else {
          console.warn('[History] ⚠️ DesignLabLayers not available', { timestamp: loadTimestamp });
        }

        console.log('[History] ===== undo COMPLETED =====', {
          historyStackLength: historyStacks[currentSide].length,
          futureStackLength: futureStacks[currentSide].length,
          timestamp: loadTimestamp
        });
      });
      
      return true;
    }
    
    console.error('[History] ❌ Failed to undo: previousState is null/undefined', {
      timestamp
    });
    return false;
  }

  // [2025-11-19 10:25:00] 重做
  function redo() {
    const canvas = window.DesignLabCanvas.getCanvas();
    if (!canvas) return false;

    if (futureStacks[currentSide].length === 0) {
      return false;
    }

    // [2025-11-19 10:25:00] 保存当前状态到历史栈
    const objects = canvas.getObjects().filter(obj => obj.name !== 'background');
    const currentState = canvas.toDatalessJSON(objects);
    historyStacks[currentSide].push(currentState);

    // [2025-11-19 10:25:00] 恢复未来状态
    const nextState = futureStacks[currentSide].pop();
    if (nextState) {
      isSaving = true;
      
      // [2025-01-28 05:35:00] 在加载新状态之前，先保存背景对象
      const backgroundFromManager = window.DesignLabCanvas && typeof window.DesignLabCanvas.getBackgroundImage === 'function' 
        ? window.DesignLabCanvas.getBackgroundImage() 
        : null;
      const backgroundFromCanvas = canvas.getObjects().find(obj => obj.name === 'background');
      const backgroundObject = backgroundFromManager || backgroundFromCanvas;
      
      // [2025-01-28 05:35:00] 如果从 manager 获取失败，但画布中有背景，尝试更新 manager
      if (!backgroundFromManager && backgroundFromCanvas && window.DesignLabCanvas && typeof window.DesignLabCanvas.setBackgroundImage === 'function') {
        window.DesignLabCanvas.setBackgroundImage(backgroundFromCanvas);
      }
      
      console.log('[History] 📋 Saving background before redo:', {
        hasBackgroundFromCanvas: !!backgroundFromCanvas,
        hasBackgroundFromManager: !!backgroundFromManager,
        hasBackgroundObject: !!backgroundObject,
        timestamp: new Date().toISOString()
      });

      canvas.loadFromJSON(nextState, () => {
        const loadTimestamp = new Date().toISOString();
        console.log('[History] ✅ Next state loaded to canvas:', {
          timestamp: loadTimestamp,
          objectsCount: canvas.getObjects().length
        });

        // [2025-01-28 05:10:00] 恢复背景对象（如果之前存在）
        if (backgroundObject) {
          const existingBg = canvas.getObjects().find(obj => obj.name === 'background');
          if (!existingBg) {
            console.log('[History] 📋 Restoring background object in redo...', {
              timestamp: loadTimestamp
            });
            
            try {
              const bgData = backgroundObject.toObject();
              window.fabric.util.enlivenObjects([bgData], (objects) => {
                if (objects && objects.length > 0) {
                  const restoredBg = objects[0];
                  canvas.add(restoredBg);
                  
                  try {
                    if (typeof canvas.sendToBack === 'function') {
                      canvas.sendToBack(restoredBg);
                    } else if (typeof canvas.sendObjectToBack === 'function') {
                      canvas.sendObjectToBack(restoredBg);
                    }
                  } catch (e) {
                    console.warn('[History] ⚠️ Failed to send restored background to back in redo:', e);
                  }
                  
                  if (window.DesignLabCanvas && typeof window.DesignLabCanvas.setBackgroundImage === 'function') {
                    window.DesignLabCanvas.setBackgroundImage(restoredBg);
                  }
                  
                  canvas.renderAll();
                  console.log('[History] ✅ Background restored in redo', {
                    timestamp: loadTimestamp
                  });
                }
              });
            } catch (e) {
              console.error('[History] ❌ Failed to restore background in redo:', e, {
                timestamp: loadTimestamp
              });
              
              if (window.DesignLabCanvas && typeof window.DesignLabCanvas.loadBackgroundForCurrentSide === 'function') {
                window.DesignLabCanvas.loadBackgroundForCurrentSide();
                console.log('[History] ✅ Background reloaded from canvasManager in redo', {
                  timestamp: loadTimestamp
                });
              }
            }
          } else {
            console.log('[History] ✅ Background already exists in canvas (redo)', {
              timestamp: loadTimestamp
            });
          }
        } else {
          console.warn('[History] ⚠️ No background to restore in redo, attempting to reload...', {
            timestamp: loadTimestamp
          });
          
          if (window.DesignLabCanvas && typeof window.DesignLabCanvas.loadBackgroundForCurrentSide === 'function') {
            window.DesignLabCanvas.loadBackgroundForCurrentSide();
            console.log('[History] ✅ Background reloaded from canvasManager in redo', {
              timestamp: loadTimestamp
            });
          }
        }

        canvas.renderAll();
        // [2025-11-22 12:55:00] 确保背景在最底层（兼容不同版本的 Fabric.js）
        const bg = canvas.getObjects().find(obj => obj.name === 'background');
        if (bg) {
          try {
            if (typeof canvas.sendToBack === 'function') {
              canvas.sendToBack(bg);
            } else if (typeof canvas.sendObjectToBack === 'function') {
              canvas.sendObjectToBack(bg);
            } else if (typeof canvas.moveTo === 'function') {
              canvas.moveTo(bg, 0);
            } else {
              // [2025-11-22 12:55:00] 如果都没有，手动移动到最底层
              const objects = canvas.getObjects();
              const index = objects.indexOf(bg);
              if (index > 0) {
                objects.splice(index, 1);
                objects.unshift(bg);
                canvas.renderAll();
              }
            }
            console.log('[History] ✅ Background sent to back in redo', { timestamp: loadTimestamp });
          } catch (e) {
            console.warn('[History] ⚠️ Failed to send background to back in redo:', e, { timestamp: loadTimestamp });
          }
        }
        isSaving = false;
        
        // [2025-11-19 10:25:00] 更新图层面板
        if (window.DesignLabLayers) {
          window.DesignLabLayers.updateLayers();
          console.log('[History] ✅ Layers panel updated in redo', { timestamp: loadTimestamp });
        }
      });
      return true;
    }
    
    return false;
  }

  // [2025-11-19 10:25:00] 切换画布面
  // [2025-01-28 04:55:00] 添加日志
  function switchSide(side) {
    const timestamp = new Date().toISOString();
    const oldSide = currentSide;
    currentSide = side;
    
    console.log('[History] ===== switchSide =====', {
      oldSide,
      newSide: currentSide,
      oldSideHistoryLength: historyStacks[oldSide]?.length || 0,
      newSideHistoryLength: historyStacks[currentSide]?.length || 0,
      timestamp
    });
    
    // [2025-11-19 10:25:00] 每个面维护独立的历史栈
  }

  // [2025-11-19 10:25:00] 检查是否可以撤销
  function canUndo() {
    return historyStacks[currentSide].length > 0;
  }

  // [2025-11-19 10:25:00] 检查是否可以重做
  function canRedo() {
    return futureStacks[currentSide].length > 0;
  }

  // [2025-11-19 10:25:00] 清空历史
  function clearHistory() {
    historyStacks[currentSide] = [];
    futureStacks[currentSide] = [];
  }

  // [2025-11-19 10:25:00] 导出全局 API
  window.DesignLabHistory = {
    saveState,
    undo,
    redo,
    switchSide,
    canUndo,
    canRedo,
    clearHistory
  };
})();

