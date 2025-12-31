/**
 * Custom Ink Product Image Research - Playwright + CDP
* 使用 Chrome DevTools Protocol 分析 Custom Ink 商品主图加载方式
 * 
 * 目标：
 * - 采集商品主图资源请求（URL、状态码、请求头、响应头、Referrer、Initiator）
 * - 采集初始化脚本中的画布放置与缩放逻辑
 * - 输出 JSON 摘要：{ productImageUrl, placement, scaling, layering }
 */

import { test, expect, chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Custom Ink Product Image Research', () => {
  test('Analyze Custom Ink product image loading with CDP', async () => {
    // 创建浏览器实例，启用 CDP
    const browser = await chromium.launch({
      headless: false, // 使用 headed 模式以便观察
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // 启用 CDP
    const client = await context.newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    
    // 收集网络请求
    const networkRequests: Array<{
      url: string;
      method: string;
      status?: number;
      requestHeaders?: Record<string, string>;
      responseHeaders?: Record<string, string>;
      referrer?: string;
      initiator?: any;
      resourceType?: string;
      timestamp: number;
    }> = [];
    
    const productImageRequests: typeof networkRequests = [];
    
    // 监听网络请求
    client.on('Network.requestWillBeSent', (params: any) => {
      const { request, requestId, type, initiator, documentURL } = params;
      const isImage = type === 'Image' || request.url.match(/\.(png|jpg|jpeg|gif|webp|svg)/i);
      
      networkRequests.push({
        url: request.url,
        method: request.method,
        requestHeaders: request.headers,
        referrer: request.headers?.['Referer'] || documentURL,
        initiator: initiator || {},
        resourceType: type,
        timestamp: Date.now(),
      });
      
      // 判断是否为产品主图（包含 product、color、view 等关键词）
      const isProductImage = isImage && (
        request.url.includes('product') ||
        request.url.includes('color') ||
        request.url.includes('view') ||
        request.url.includes('imgix') ||
        request.url.includes('catalog')
      );
      
      if (isProductImage) {
        productImageRequests.push({
          url: request.url,
          method: request.method,
          requestHeaders: request.headers,
          referrer: request.headers?.['Referer'] || documentURL,
          initiator: initiator || {},
          resourceType: type,
          timestamp: Date.now(),
        });
      }
    });
    
    // 监听网络响应
    client.on('Network.responseReceived', async (params: any) => {
      const { response, requestId } = params;
      const request = networkRequests.find(r => r.url === response.url);
      if (request) {
        request.status = response.status;
        request.responseHeaders = response.headers;
      }
      
      // 更新产品图片请求状态
      const productRequest = productImageRequests.find(r => r.url === response.url);
      if (productRequest) {
        productRequest.status = response.status;
        productRequest.responseHeaders = response.headers;
      }
    });
    
    // 收集控制台消息
    const consoleMessages: Array<{ type: string; text: string; timestamp: number }> = [];
    page.on('console', (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
      });
    });
    
    // 访问 Custom Ink Design Lab
    const customInkUrl = 'https://www.customink.com/ndx/?SK=176100&PK=176100#/uploadForm';
    console.log(`[Research] Navigating to ${customInkUrl}`);
    await page.goto(customInkUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    // 等待页面加载和画布初始化
    await page.waitForTimeout(5000);
    
    // 尝试定位产品图片元素（通过 Canvas 或 img 标签）
    const canvasElements = await page.locator('canvas').all();
    const imgElements = await page.locator('img[src*="product"], img[src*="color"], img[src*="catalog"]').all();
    
    // 采集画布信息
    const canvasInfo = await Promise.all(canvasElements.map(async (canvas, index) => {
      const boundingBox = await canvas.boundingBox();
      const computedStyle = await canvas.evaluate((el: HTMLCanvasElement) => {
        const styles = window.getComputedStyle(el);
        return {
          width: styles.width,
          height: styles.height,
          transform: styles.transform,
          position: styles.position,
          zIndex: styles.zIndex,
        };
      });
      
      return {
        index,
        boundingBox,
        computedStyle,
      };
    }));
    
    // 采集图片元素信息
    const imgInfo = await Promise.all(imgElements.map(async (img, index) => {
      const src = await img.getAttribute('src');
      const boundingBox = await img.boundingBox();
      const computedStyle = await img.evaluate((el: HTMLImageElement) => {
        const styles = window.getComputedStyle(el);
        return {
          width: styles.width,
          height: styles.height,
          transform: styles.transform,
          position: styles.position,
          zIndex: styles.zIndex,
          objectFit: styles.objectFit,
        };
      });
      
      return {
        index,
        src,
        boundingBox,
        computedStyle,
      };
    }));
    
    // 尝试执行 JavaScript 获取画布内部对象（如果使用 Fabric.js 或其他 Canvas 库）
    const canvasInternalData = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      const results: any[] = [];
      
      canvases.forEach((canvas, index) => {
        const ctx = (canvas as HTMLCanvasElement).getContext('2d');
        if (ctx) {
          // 尝试获取 Canvas 尺寸
          results.push({
            index,
            width: canvas.width,
            height: canvas.height,
            clientWidth: canvas.clientWidth,
            clientHeight: canvas.clientHeight,
          });
        }
        
        // 尝试访问全局对象（如 window.fabric）
        const fabric = (window as any).fabric;
        if (fabric) {
          results[index].fabric = {
            available: true,
            version: fabric.version || 'unknown',
          };
        }
      });
      
      return results;
    });
    
    // 收集最终的摘要数据
    const summary = {
      productImageUrl: productImageRequests.length > 0 ? productImageRequests[0].url : null,
      productImageRequests: productImageRequests.map(req => ({
        url: req.url,
        status: req.status,
        referrer: req.referrer,
        resourceType: req.resourceType,
      })),
      placement: {
        anchor: 'center', // 待分析确认
        offset: { x: 0, y: 0 }, // 待分析确认
      },
      scaling: {
        fit: 'contain', // 待分析确认
        maxWidth: canvasInfo[0]?.boundingBox?.width || null,
        maxHeight: canvasInfo[0]?.boundingBox?.height || null,
        dpi: null, // 待分析确认
        safeArea: null, // 待分析确认
      },
      layering: {
        order: ['background', 'product-image', 'upload', 'text'], // 待分析确认
        zIndex: null, // 待分析确认
      },
      canvasInfo,
      imgInfo,
      canvasInternalData,
      networkSummary: {
        totalRequests: networkRequests.length,
        imageRequests: networkRequests.filter(r => r.resourceType === 'Image').length,
        productImageRequests: productImageRequests.length,
      },
    };
    
    // 保存结果到文件
    const outputDir = path.join(__dirname, '../../artifacts');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'customink-product-image.json');
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
    
    console.log(`[Research] Summary saved to ${outputPath}`);
    console.log(`[Research] Product Image URL: ${summary.productImageUrl}`);
    console.log(`[Research] Total Network Requests: ${networkRequests.length}`);
    console.log(`[Research] Product Image Requests: ${productImageRequests.length}`);
    
    // 验证至少找到了产品图片请求
    expect(productImageRequests.length).toBeGreaterThan(0);
    
    await browser.close();
  });
});
