#!/usr/bin/env node
/**
 * 通过 Tavily API 搜索商品图片，生成 productImages.json
 * 用于 Referral 活动商品展示
 * 需要设置 TAVILY_API_KEY（https://tavily.com 注册获取）
 * 使用方式：npm run referral:fetch-images 或 cd backend && node scripts/fetch-product-images-tavily.js
 * 2026-03-01 创建
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const https = require('https');
const http = require('http');

// 商品列表：id + 搜索关键词
const PRODUCTS = [
  { id: 'p01', name: '无线降噪耳机 Pro 版', query: 'wireless noise cancelling headphones' },
  { id: 'p02', name: '真无线蓝牙耳机 长续航版', query: 'true wireless bluetooth earbuds' },
  { id: 'p03', name: '便携蓝牙音箱 防水设计', query: 'portable waterproof bluetooth speaker' },
  { id: 'p04', name: '头戴式游戏耳机 7.1 声道', query: 'gaming headset 7.1' },
  { id: 'p05', name: '运动防水骨传导耳机', query: 'bone conduction headphones sport' },
  { id: 'p06', name: '智能音箱 语音助手', query: 'smart speaker voice assistant' },
  { id: 'p07', name: 'GPS 运动智能手表', query: 'GPS smartwatch fitness' },
  { id: 'p08', name: '健康监测手环 心率血氧', query: 'fitness tracker heart rate' },
  { id: 'p09', name: '户外三防太阳能手表', query: 'solar outdoor watch' },
  { id: 'p10', name: '商务智能手表 大屏', query: 'smartwatch business large screen' },
  { id: 'p11', name: '10 寸平板 高分辨率屏', query: '10 inch tablet' },
  { id: 'p12', name: '电子书阅读器 护眼屏', query: 'e-reader e-ink' },
  { id: 'p13', name: '便携平板 8 寸', query: '8 inch portable tablet' },
  { id: 'p14', name: '绘图平板 专业压感', query: 'drawing tablet pen pressure' },
  { id: 'p15', name: '27 寸 2K 显示器', query: '27 inch 2K monitor' },
  { id: 'p16', name: '机械键盘 青轴 RGB', query: 'mechanical keyboard RGB' },
  { id: 'p17', name: '无线鼠标 人体工学', query: 'ergonomic wireless mouse' },
  { id: 'p18', name: '4K 便携显示器 15.6 寸', query: 'portable 4K monitor 15.6' },
  { id: 'p19', name: '高清网络摄像头 降噪麦克风', query: 'webcam HD noise cancelling' },
  { id: 'p20', name: '65W 多口快充充电器', query: '65W multi port charger' },
  { id: 'p21', name: '20000mAh 移动电源', query: '20000mAh power bank' },
  { id: 'p22', name: 'MagSafe 无线充电座', query: 'MagSafe wireless charger' },
  { id: 'p23', name: '智能扫地机器人', query: 'robot vacuum cleaner' },
  { id: 'p24', name: '智能门铃 可视对讲', query: 'smart video doorbell' },
  { id: 'p25', name: '智能音箱 Hub 家庭中心', query: 'smart home hub speaker' },
  { id: 'p26', name: '空气净化器 除霾除甲醛', query: 'air purifier HEPA' },
  { id: 'p27', name: '运动相机 4K 防水', query: 'action camera 4K waterproof' },
  { id: 'p28', name: '无人机 4K 航拍', query: 'drone 4K camera' },
  { id: 'p29', name: '环形补光灯 主播专用', query: 'ring light for streaming' },
  { id: 'p30', name: '稳定器 手持云台', query: 'gimbal stabilizer' },
  { id: 'p31', name: '高端降噪头戴耳机', query: 'premium noise cancelling headphones' },
  { id: 'p32', name: '32 寸 4K 专业显示器', query: '32 inch 4K professional monitor' },
  { id: 'p33', name: '高端服务套餐', query: 'premium service gift card' },
];

const TAVILY_API_URL = 'https://api.tavily.com/search';
const OUTPUT_PATH = path.join(__dirname, '../../apps/web/src/app/referral/data/productImages.json');

function loadApiKey() {
  return process.env.TAVILY_API_KEY || '';
}

function postJson(url, body, apiKey) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    const req = (u.protocol === 'https:' ? https : http).request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname,
        method: 'POST',
        headers,
      },
      (res) => {
        let buf = '';
        res.on('data', (ch) => (buf += ch));
        res.on('end', () => {
          try {
            resolve(JSON.parse(buf));
          } catch (e) {
            reject(new Error('Invalid JSON: ' + buf.slice(0, 200)));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function fetchImageForProduct(apiKey, product) {
  const res = await postJson(
    TAVILY_API_URL,
    {
      query: product.query + ' product image',
      search_depth: 'basic',
      max_results: 5,
      include_images: true,
    },
    apiKey
  );
  const images = res?.images || [];
  // Tavily 返回 string[] 或 {url,description}[]，兼容两种格式
  const first = images[0];
  const url = typeof first === 'string' ? first : first?.url;
  return url || null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error('错误：未设置 TAVILY_API_KEY。请在 backend/.env 中添加 TAVILY_API_KEY=xxx');
    console.error('在 https://tavily.com 注册后可获取 API Key。');
    process.exit(1);
  }

  const result = {};
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    process.stdout.write(`[${i + 1}/${PRODUCTS.length}] ${p.name}... `);
    try {
      const url = await fetchImageForProduct(apiKey, p);
      result[p.id] = url || `https://picsum.photos/seed/${p.id}/400/400`;
      console.log(url ? 'OK' : '(fallback)');
    } catch (e) {
      console.error('ERR:', e.message);
      result[p.id] = `https://picsum.photos/seed/${p.id}/400/400`;
    }
    await sleep(500);
  }

  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), 'utf8');
  console.log('\n已写入:', OUTPUT_PATH);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
