/**
 * Product Detail Preview Test
* 预览像素级精确商品详情页面
 */
'use client';

import { useState } from 'react';
import { PixelPerfectProductDetail } from '@/components/product/PixelPerfectProductDetail';

// 模拟商品数据
const mockProduct = {
  id: 'test-product-1',
  name: '经典定制T恤',
  slug: 'classic-custom-t-shirt',
  description: '这是我们的经典定制T恤，采用100%优质棉制成，舒适透气，完美适合日常穿着。支持多种颜色和尺寸选择，可自定义图案和文字。',
  basePrice: 2500,
  price: {
    base: 2500,
    sale: 1800,
    currency: 'CNY',
    onSale: true
  },
  sku: 'TSH-001',
  variants: [
    {
      id: 'var-1',
      color: '白色',
      colorHex: '#FFFFFF',
      size: 'M',
      sku: 'TSH-001-WHT-M',
      priceAdjustment: 0,
      stockQuantity: 50,
      imageUrl: null
    },
    {
      id: 'var-2',
      color: '黑色',
      colorHex: '#000000',
      size: 'M',
      sku: 'TSH-001-BLK-M',
      priceAdjustment: 0,
      stockQuantity: 30,
      imageUrl: null
    },
    {
      id: 'var-3',
      color: '白色',
      colorHex: '#FFFFFF',
      size: 'L',
      sku: 'TSH-001-WHT-L',
      priceAdjustment: 100,
      stockQuantity: 45,
      imageUrl: null
    }
  ],
  images: [
    {
      id: 'img-1',
      url: '/assets/hero/hero-card-tee.jpg',
      alt: '经典定制T恤 - 前视图',
      sortOrder: 1
    },
    {
      id: 'img-2',
      url: '/assets/hero/hero-bottles.jpg',
      alt: '经典定制T恤 - 侧视图',
      sortOrder: 2
    }
  ],
  category: {
    name: 'T恤',
    slug: 't-shirts'
  },
  brand: {
    name: 'Custom Brand',
    slug: 'custom-brand'
  },
  rating: {
    average: 4.5,
    count: 128
  }
};

export default function TestPreviewPage() {
  const [useMockData, setUseMockData] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 控制面板 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 mb-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">商品详情页面预览测试</h1>
          
          <div className="flex items-center gap-6 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useMockData}
                onChange={(e) => setUseMockData(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">使用模拟数据</span>
            </label>
            
            <div className="text-sm text-gray-600">
              {useMockData ? (
                <span className="text-green-600 font-medium">✅ 已加载模拟数据</span>
              ) : (
                <span className="text-orange-600 font-medium">⚠️ 需要从URL获取商品数据</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">🧩 组件功能</h3>
              <ul className="space-y-1 text-blue-700">
                <li>✅ 占位符价格显示 (¥--)</li>
                <li>✅ 占位符图片显示</li>
                <li>✅ 智能折扣计算</li>
                <li>✅ 加载骨架屏</li>
                <li>✅ 错误状态处理</li>
              </ul>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">📱 响应式设计</h3>
              <ul className="space-y-1 text-green-700">
                <li>✅ 移动端 (&lt;768px): 单列布局</li>
                <li>✅ 平板端 (768px-1023px): 2列布局</li>
                <li>✅ 桌面端 (≥1024px): 500px+主内容布局</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">🎨 交互效果</h3>
              <ul className="space-y-1 text-purple-700">
                <li>✅ 颜色选择器 (圆形按钮)</li>
                <li>✅ 尺寸选择器 (网格按钮)</li>
                <li>✅ 图片缩放 (点击放大)</li>
                <li>✅ 悬停动画 (缩放+阴影)</li>
              </ul>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>测试方法:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>访问 <code className="bg-gray-100 px-2 py-1 rounded">/products/your-product-slug</code> 测试实际API数据</li>
              <li>启用&quot;使用模拟数据&quot;测试完整功能和占位符</li>
              <li>调整浏览器窗口大小测试响应式布局</li>
              <li>使用开发者工具模拟慢速网络测试加载状态</li>
            </ol>
          </div>
        </div>
      </div>

      {/* 组件预览 */}
      <div className="max-w-6xl mx-auto">
        {useMockData ? (
          <div>
            {/* 模拟URL参数 */}
            <script dangerouslySetInnerHTML={{
              __html: `
                // 模拟URL参数
                window.history.replaceState(null, '', '/products/test-mock-product');
                const originalUseParams = require('next/navigation').useParams;
                require('next/navigation').useParams = () => ({ slug: 'test-mock-product' });
              `
            }} />
            
            {/* 模拟API响应 */}
            <script dangerouslySetInnerHTML={{
              __html: `
                // 模拟API响应
                const originalFetch = window.fetch;
                window.fetch = function(url, options) {
                  if (url.includes('/api/products/')) {
                    return Promise.resolve({
                      ok: true,
                      json: () => Promise.resolve(${JSON.stringify(mockProduct)})
                    });
                  }
                  return originalFetch(url, options);
                };
              `
            }} />
            
            <PixelPerfectProductDetail />
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">请在上方选择测试模式</p>
            <p className="text-sm text-gray-500">
              或直接访问 <code className="bg-gray-100 px-2 py-1 rounded">/products/your-product-slug</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}