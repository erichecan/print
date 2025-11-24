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
      objectNames: objects.map(obj => ({ name: obj.name, type: obj.type })),
      timestamp
    });

    const state = canvas.toDatalessJSON(objects);
    const stateSize = JSON.stringify(state).length;
    const stateObjectCount = state.objects ? state.objects.length : 0;
    
    console.log('[History] 📋 State serialized:', {
      stateSize: `${(stateSize / 1024).toFixed(2)}KB`,
      stateObjectCount: stateObjectCount,
      stateObjects: state.objects ? state.objects.map(obj => ({ type: obj.type, name: obj.name || 'unnamed' })) : [],
      statePreview: JSON.stringify(state).substring(0, 200) + '...',
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
  // [2025-01-27] 只撤销图层操作（上传图片、add text、add art），不影响主图（背景）
  // [2025-01-28 04:55:00] 添加详细日志用于调试
  function undo() {
    const timestamp = new Date().toISOString();
    console.log('[History] ===== undo CALLED =====', {
      timestamp,
      currentSide,
      historyStackLength: historyStacks[currentSide]?.length || 0,
      futureStackLength: futureStacks[currentSide]?.length || 0,
      isSaving,
      note: 'Undo only affects layer operations (upload image, add text, add art), background will be preserved'
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
        timestamp,
        note: 'No layer operations to undo'
      });
      return false;
    }

    // [2025-11-19 10:25:00] 保存当前状态到未来栈
    const allObjects = canvas.getObjects();
    const objects = allObjects.filter(obj => obj.name !== 'background');
    const currentState = canvas.toDatalessJSON(objects);
    const currentStateObjectCount = currentState.objects ? currentState.objects.length : 0;
    
    console.log('[History] 📋 Saving current state to future stack:', {
      totalObjects: allObjects.length,
      objectsExcludingBackground: objects.length,
      currentStateObjectCount: currentStateObjectCount,
      currentObjectNames: objects.map(obj => ({ name: obj.name, type: obj.type })),
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
    
    const previousStateObjectCount = previousState && previousState.objects ? previousState.objects.length : 0;
    const previousStateObjects = previousState && previousState.objects ? previousState.objects.map(obj => ({ type: obj.type, name: obj.name || 'unnamed' })) : [];
    
    console.log('[History] 📋 Popped previous state from history stack:', {
      hasPreviousState: !!previousState,
      previousStateSize: previousState ? JSON.stringify(previousState).length : 0,
      previousStateObjectCount: previousStateObjectCount,
      previousStateObjects: previousStateObjects,
      newHistoryLength,
      timestamp
    });

    if (previousState) {
      isSaving = true;
      console.log('[History] 📋 Loading previous state to canvas...', {
        previousStateObjectCount: previousStateObjectCount,
        previousStateObjects: previousStateObjects,
        statePreview: JSON.stringify(previousState).substring(0, 200) + '...',
        timestamp
      });

      // [2025-01-27] 不保存背景对象 - 如果 loadFromJSON 后背景缺失，直接重新加载
      // 这样可以确保主图（背景）永远不会被 undo 影响
      console.log('[History] 📋 Loading previous state (background will be preserved/restored if missing)', {
        timestamp
      });
      
      canvas.loadFromJSON(previousState, () => {
        const loadTimestamp = new Date().toISOString();
        const allObjectsAfterLoad = canvas.getObjects();
        const objectsCount = allObjectsAfterLoad.length;
        const backgroundAfterLoad = allObjectsAfterLoad.find(obj => obj.name === 'background');
        
        const objectsAfterLoad = allObjectsAfterLoad.filter(obj => obj.name !== 'background');
        console.log('[History] ✅ Previous state loaded to canvas:', {
          timestamp: loadTimestamp,
          totalObjectsCount: objectsCount,
          objectsExcludingBackground: objectsAfterLoad.length,
          hasBackground: !!backgroundAfterLoad,
          backgroundType: backgroundAfterLoad?.type,
          allObjectNames: allObjectsAfterLoad.map(obj => ({ name: obj.name, type: obj.type })),
          loadedObjectNames: objectsAfterLoad.map(obj => ({ name: obj.name, type: obj.type })),
          note: '⚠️ loadFromJSON may have cleared background - will restore if missing',
          expectedObjects: previousStateObjectCount,
          actualObjects: objectsAfterLoad.length
        });

        // [2025-01-28 05:35:00] 检查画布中是否已经有背景（loadFromJSON 后）
        const existingBg = backgroundAfterLoad;
        
        // [2025-01-27] 获取 canvasManager 中的背景引用（用于日志）
        const bgFromManager = window.DesignLabCanvas && typeof window.DesignLabCanvas.getBackgroundImage === 'function' 
          ? window.DesignLabCanvas.getBackgroundImage() 
          : null;
        
        console.log('[History] 📋 Background check after loadFromJSON:', {
          timestamp: loadTimestamp,
          existingBgFound: !!existingBg,
          canvasManagerBg: !!bgFromManager,
          canvasManagerBgType: bgFromManager?.type,
          note: 'If background missing, will reload immediately'
        });
        
        // [2025-01-27] 背景不存在，立即重新加载（最可靠的方法）
        // 主图（背景）必须永远存在，即使恢复到空状态也要保留
        if (!existingBg) {
          console.log('[History] 📋 Background missing after loadFromJSON, immediately reloading...', {
            timestamp: loadTimestamp,
            totalObjects: objectsCount,
            previousStateObjectsCount: previousState?.objects?.length || 0,
            willReload: !!(window.DesignLabCanvas && typeof window.DesignLabCanvas.loadBackgroundForCurrentSide === 'function'),
            note: '⚠️ Background must always be preserved - reloading now'
          });
          
          // [2025-01-27] 直接重新加载背景（loadFromJSON 会清空画布，包括背景，所以需要重新加载）
          if (window.DesignLabCanvas && typeof window.DesignLabCanvas.loadBackgroundForCurrentSide === 'function') {
            // [2025-01-27] 立即调用，不等待
            window.DesignLabCanvas.loadBackgroundForCurrentSide();
            console.log('[History] ✅ Background reload requested from canvasManager (immediate)', {
              timestamp: loadTimestamp
            });
          } else {
            console.error('[History] ❌ Cannot reload background - loadBackgroundForCurrentSide not available', {
              timestamp: loadTimestamp,
              hasDesignLabCanvas: !!window.DesignLabCanvas,
              hasLoadMethod: !!(window.DesignLabCanvas && typeof window.DesignLabCanvas.loadBackgroundForCurrentSide === 'function')
            });
          }
          
          // [2025-01-27] 继续执行最终检查（背景正在异步加载，最终检查会验证）
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
        
        // [2025-01-27] 最终检查：确保背景存在且在最底层（兼容不同版本的 Fabric.js）
        const finalBg = canvas.getObjects().find(obj => obj.name === 'background');
        const finalCheckTimestamp = new Date().toISOString();
        const allObjectsFinal = canvas.getObjects();
        
        const previousStateWasEmpty = !previousState.objects || previousState.objects.length === 0;
        
        console.log('[History] 📋 Final check before completing undo:', {
          timestamp: finalCheckTimestamp,
          totalObjects: allObjectsFinal.length,
          hasBackground: !!finalBg,
          allObjectNames: allObjectsFinal.map(obj => ({ name: obj.name, type: obj.type })),
          previousStateWasEmpty: previousStateWasEmpty,
          previousStateSize: previousState ? JSON.stringify(previousState).length : 0,
          note: previousStateWasEmpty ? '⚠️ Restoring to empty state - background must be preserved!' : 'Restoring to state with objects'
        });
        
        if (finalBg) {
          console.log('[History] ✅ Final background check: Background exists in canvas', {
            timestamp: finalCheckTimestamp,
            backgroundType: finalBg.type,
            backgroundLeft: finalBg.left,
            backgroundTop: finalBg.top,
            backgroundWidth: finalBg.width,
            backgroundHeight: finalBg.height,
            totalObjects: allObjectsFinal.length
          });
          
          try {
            if (typeof canvas.sendToBack === 'function') {
              canvas.sendToBack(finalBg);
            } else if (typeof canvas.sendObjectToBack === 'function') {
              canvas.sendObjectToBack(finalBg);
            } else if (typeof canvas.moveTo === 'function') {
              canvas.moveTo(finalBg, 0);
            } else {
              // [2025-11-22 12:55:00] 如果都没有，手动移动到最底层
              const objects = canvas.getObjects();
              const index = objects.indexOf(finalBg);
              if (index > 0) {
                objects.splice(index, 1);
                objects.unshift(finalBg);
                canvas.renderAll();
              }
            }
            console.log('[History] ✅ Background sent to back successfully', { timestamp: finalCheckTimestamp });
          } catch (e) {
            console.warn('[History] ⚠️ Failed to send background to back:', e, { timestamp: finalCheckTimestamp });
          }
          
          // [2025-01-27] 确保 canvasManager 的 backgroundImage 变量同步
          if (window.DesignLabCanvas && typeof window.DesignLabCanvas.setBackgroundImage === 'function') {
            window.DesignLabCanvas.setBackgroundImage(finalBg);
            console.log('[History] ✅ CanvasManager backgroundImage variable synchronized', { timestamp: finalCheckTimestamp });
          }
        } else {
          console.error('[History] ❌ CRITICAL: Background not found after all restore attempts!', {
            timestamp: finalCheckTimestamp,
            totalObjects: canvas.getObjects().length,
            objectNames: canvas.getObjects().map(obj => ({ name: obj.name, type: obj.type })),
            willAttemptReload: !!(window.DesignLabCanvas && typeof window.DesignLabCanvas.loadBackgroundForCurrentSide === 'function')
          });
          
          // [2025-01-27] 最后尝试：重新加载背景（使用更长的延迟确保图片加载完成）
          if (window.DesignLabCanvas && typeof window.DesignLabCanvas.loadBackgroundForCurrentSide === 'function') {
            console.log('[History] 🔄 Attempting to reload background from canvasManager as last resort...', {
              timestamp: finalCheckTimestamp
            });
            
            // [2025-01-27] 立即调用一次
            window.DesignLabCanvas.loadBackgroundForCurrentSide();
            
            // [2025-01-27] 延迟检查是否成功加载
            setTimeout(() => {
              const reloadCheck = canvas.getObjects().find(obj => obj.name === 'background');
              if (reloadCheck) {
                console.log('[History] ✅ Background successfully reloaded from canvasManager', {
                  timestamp: new Date().toISOString(),
                  backgroundType: reloadCheck.type
                });
              } else {
                console.error('[History] ❌ Background reload from canvasManager failed! Retrying...', {
                  timestamp: new Date().toISOString()
                });
                // [2025-01-27] 如果第一次失败，再试一次
                setTimeout(() => {
                  window.DesignLabCanvas.loadBackgroundForCurrentSide();
                  setTimeout(() => {
                    const finalCheck = canvas.getObjects().find(obj => obj.name === 'background');
                    if (finalCheck) {
                      console.log('[History] ✅ Background reloaded on retry', {
                        timestamp: new Date().toISOString()
                      });
                    } else {
                      console.error('[History] ❌ Background reload failed after retry!', {
                        timestamp: new Date().toISOString()
                      });
                    }
                  }, 300);
                }, 200);
              }
            }, 300);
          }
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

