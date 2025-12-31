/**
* 添加颜色弹窗组件
 * 让用户选择是否继承上一颜色的print positions
 */
'use client';

import { useState } from 'react';

interface AddColorModalProps {
  isOpen: boolean;
  previousColorName?: string;
  hasPreviousColor: boolean;
  onConfirm: (inheritFromPrev: boolean) => void;
  onCancel: () => void;
}

export function AddColorModal({
  isOpen,
  previousColorName,
  hasPreviousColor,
  onConfirm,
  onCancel
}: AddColorModalProps) {
  const [inheritFromPrev, setInheritFromPrev] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">添加新颜色</h3>
        
        {hasPreviousColor ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              请选择如何设置新颜色的印刷位置：
            </p>
            
            <label className="flex items-start gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <input
                type="radio"
                name="inheritOption"
                checked={inheritFromPrev}
                onChange={() => setInheritFromPrev(true)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  继承上一颜色的 print positions
                </div>
                <div className="text-xs text-gray-500 mt-1">
{/* 修复 ESLint react/no-unescaped-entities：避免直接使用双引号（显示效果不变） */}
                  复制“{previousColorName}”的所有印刷位置配置（不包含文件）
                </div>
              </div>
            </label>
            
            <label className="flex items-start gap-3 cursor-pointer p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <input
                type="radio"
                name="inheritOption"
                checked={!inheritFromPrev}
                onChange={() => setInheritFromPrev(false)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  从空白开始
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  不继承任何配置，自行选择印刷位置
                </div>
              </div>
            </label>
          </div>
        ) : (
          <p className="text-sm text-gray-600 mb-4">
            这是第一个颜色，将创建新的印刷位置配置。
          </p>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(inheritFromPrev && hasPreviousColor)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
