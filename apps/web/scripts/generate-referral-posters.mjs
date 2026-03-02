#!/usr/bin/env node
/**
 * 生成 Referral 三平台活动海报 PNG，保存到 public/referral-posters/
 * 使用 Playwright 渲染 HTML 后截图，无需 Pencil 导出
 * 2026-03-02
 */

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/referral-posters');

const RED = '#E42313';
const DARK = '#0D0D0D';
const GRAY = '#3D3D3D';
const MUTED = '#7A7A7A';

const posters = [
  {
    filename: 'ins.png',
    width: 1080,
    height: 1080,
    title: '邀请好友 · 一起赚',
    sub: '限时邀请好友享专属福利，你买我奖，一起赚！',
    cta: '立即参与',
    tag: 'Instagram',
    hero: '邀请有礼',
  },
  {
    filename: 'fb.png',
    width: 1200,
    height: 630,
    title: 'Invite Friends & Earn',
    sub: 'Share this deal on Facebook! Get rewards when your friends join and buy.',
    cta: 'Share on Facebook',
    tag: 'Facebook',
    hero: 'EARN REWARDS',
  },
  {
    filename: 'xiaohongshu.png',
    width: 1080,
    height: 1440,
    title: '邀请好友 · 一起赚',
    sub: '邀请好友下单，你拿返现。发小红书种草还能再赚一波～',
    cta: '去分享',
    tag: '小红书',
    hero: '种草返现',
  },
];

function buildHtml(p) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: ${p.width}px; height: ${p.height}px;
      display: flex; flex-direction: column;
      padding: ${p.height === 1440 ? 56 : p.height === 1080 ? 48 : 40}px;
      gap: ${p.height === 1440 ? 28 : p.height === 1080 ? 24 : 20}px;
      background: ${p.height === 1440 ? '#FFF5F5' : p.height === 1080 ? '#FAFAFA' : '#FFFFFF'};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .bar { width: ${p.height === 1440 ? 140 : p.height === 1080 ? 120 : 100}px; height: ${p.height === 1440 ? 6 : 5}px; background: ${RED}; border-radius: 3px; }
    .title { font-size: ${p.height === 1440 ? 48 : p.height === 1080 ? 52 : 42}px; font-weight: bold; color: ${DARK}; }
    .sub { font-size: ${p.height === 1440 ? 24 : p.height === 1080 ? 22 : 20}px; color: ${GRAY}; line-height: 1.4; }
    .hero {
      flex: 1;
      min-height: ${p.height === 1440 ? 480 : p.height === 1080 ? 380 : 220}px;
      background: ${RED};
      border-radius: ${p.height === 1440 ? 20 : p.height === 1080 ? 16 : 12}px;
      display: flex; align-items: center; justify-content: center;
      font-size: ${p.height === 1440 ? 56 : p.height === 1080 ? 48 : 28}px;
      font-weight: bold; color: #fff;
    }
    .cta {
      padding: ${p.height === 1440 ? '24px 40px' : p.height === 1080 ? '20px 36px' : '16px 28px'};
      background: ${RED};
      border-radius: ${p.height === 1440 ? 14 : p.height === 1080 ? 12 : 8}px;
      text-align: center;
      font-size: ${p.height === 1440 ? 26 : p.height === 1080 ? 24 : 18}px;
      font-weight: bold; color: #fff;
    }
    .tag { font-size: ${p.height === 1440 ? 14 : 12}px; color: ${MUTED}; }
  </style>
</head>
<body>
  <div class="bar"></div>
  <div class="title">${p.title}</div>
  <div class="sub">${p.sub}</div>
  <div class="hero">${p.hero}</div>
  <div class="cta">${p.cta}</div>
  <div class="tag">${p.tag}</div>
</body>
</html>`;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  for (const p of posters) {
    const page = await context.newPage();
    await page.setViewportSize({ width: p.width, height: p.height });
    await page.setContent(buildHtml(p), { waitUntil: 'networkidle' });
    const outPath = path.join(OUT_DIR, p.filename);
    await page.screenshot({ path: outPath, type: 'png' });
    console.log('Saved:', outPath);
    await page.close();
  }
  await browser.close();
  console.log('Done. All 3 posters in', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
