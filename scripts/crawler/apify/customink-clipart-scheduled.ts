/**
 * CustomInk Clipart Scheduled Crawler
* 定时抓取脚本：每小时抓取 50 个素材，遍历全部类目
 * 
 * 功能：
 * 1. 获取所有根分类
 * 2. 按分类轮询，确保所有分类都被处理
 * 3. 记录已处理的分类和素材，避免重复
 * 4. 每小时限制抓取 50 个素材
 * 5. 自动上传到 GCS 并存储到数据库
 */

import { chromium } from 'playwright';
import type { Page } from 'playwright';
import { PrismaClient } from '@prisma/client';
import { Storage } from '@google-cloud/storage';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as zlib from 'zlib';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'https://www.customink.com';
const OUTPUT_ROOT = path.join('/tmp', 'art-crawler');
const DELAY_BETWEEN_REQUESTS = 200;
const MAX_ITEMS_PER_HOUR = 50;

const BUCKET_NAME = process.env.GCP_IMAGE_BUCKET || 'print-main-assets';
const PROJECT_ID = process.env.GCP_PROJECT_ID;
const BASE_URL_GCS = process.env.GCP_IMAGE_BASE_URL || `https://storage.googleapis.com/${BUCKET_NAME}`;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ 错误: 未设置 DATABASE_URL 环境变量');
  process.exit(1);
}

const prisma = new PrismaClient();
const storage = PROJECT_ID ? new Storage({ projectId: PROJECT_ID }) : null;
const bucket = storage ? storage.bucket(BUCKET_NAME) : null;

const STATE_FILE = path.join(OUTPUT_ROOT, '.crawler-state.json');

interface Category {
  id: number;
  name: string;
  keyword: string;
  rank: number | null;
  leaf: boolean;
  _links: { self: { href: string } };
  _embedded?: { children?: Category[]; parent?: Category };
}

interface Clipart {
  id: number;
  original_filename: string;
  _links: { self: { href: string } };
  black_white: boolean;
  visible_colors: string[];
  licensed: boolean;
}

interface BrowseResponse {
  tag: { id: number; name: string };
  count: number;
  _embedded: { cliparts: Clipart[]; category: Category };
}

interface ArtworkMetadata {
  title: string;
  slug: string;
  sourceUrl: string;
  tags: string[];
  license: string;
  attribution?: string;
  fileName: string;
  mimeType: string;
  width?: number;
  height?: number;
  gcsKey?: string;
  thumbnailKey?: string;
  categoryId?: number;
  categoryName?: string;
  topCategory?: string;
  subCategory?: string;
}

interface CrawlerState {
  lastCategoryIndex: number;
  processedCategories: number[];
  processedClipartIds: number[];
  lastRunTime: string;
  totalProcessed: number;
}

function loadState(): CrawlerState {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    } catch (error) {
      console.warn('⚠️  状态文件损坏，创建新状态');
    }
  }
  return {
    lastCategoryIndex: 0,
    processedCategories: [],
    processedClipartIds: [],
    lastRunTime: new Date().toISOString(),
    totalProcessed: 0,
  };
}

function saveState(state: CrawlerState): void {
  if (!fs.existsSync(OUTPUT_ROOT)) {
    fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function httpGet<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302 || 
          response.statusCode === 307 || response.statusCode === 308) {
        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
          reject(new Error(`Redirect without location: ${url}`));
          return;
        }
        const absoluteUrl = redirectUrl.startsWith('http') 
          ? redirectUrl 
          : new URL(redirectUrl, url).toString();
        return httpGet<T>(absoluteUrl).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }
      
      let stream: NodeJS.ReadableStream = response;
      if (response.headers['content-encoding'] === 'gzip') {
        stream = response.pipe(zlib.createGunzip());
      } else if (response.headers['content-encoding'] === 'deflate') {
        stream = response.pipe(zlib.createInflate());
      }
      
      let data = '';
      stream.on('data', (chunk: Buffer) => {
        data += chunk.toString('utf8');
      });
      
      stream.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          reject(new Error(`Invalid JSON: ${url} - ${error instanceof Error ? error.message : String(error)}`));
        }
      });
      
      stream.on('error', (err: Error) => {
        reject(new Error(`Stream error: ${url} - ${err.message}`));
      });
    });
    
    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error(`Request timeout: ${url}`));
    });
  });
}

function downloadImage(url: string, filePath: string, redirectCount = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error('Too many redirects'));
      return;
    }
    
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filePath);
    
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302 || 
          response.statusCode === 307 || response.statusCode === 308) {
        file.close();
        fs.unlink(filePath, () => {});
        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
          reject(new Error(`Redirect without location: ${url}`));
          return;
        }
        const absoluteUrl = redirectUrl.startsWith('http') 
          ? redirectUrl 
          : new URL(redirectUrl, url).toString();
        return downloadImage(absoluteUrl, filePath, redirectCount + 1).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(filePath, () => {});
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });
    
    request.on('error', (err) => {
      file.close();
      fs.unlink(filePath, () => {});
      reject(err);
    });
    
    request.setTimeout(30000, () => {
      request.destroy();
      file.close();
      fs.unlink(filePath, () => {});
      reject(new Error(`Download timeout: ${url}`));
    });
  });
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };
  return mimeTypes[ext] || 'image/png';
}

async function fetchCategory(categoryId: number): Promise<Category> {
  const url = `${BASE_URL}/clipart/clipart_categories/${categoryId}.json`;
  return httpGet<Category>(url);
}

async function getAllRootCategories(): Promise<Category[]> {
  const defaultRootIds = [6293]; // Emojis
  const categories: Category[] = [];
  for (const id of defaultRootIds) {
    try {
      await delay(DELAY_BETWEEN_REQUESTS);
      const category = await fetchCategory(id);
      categories.push(category);
      console.log(`  ✅ 加载根分类: ${category.name} (ID: ${id})`);
    } catch (e) {
      console.error(`  ❌ 加载根分类 ${id} 失败:`, e instanceof Error ? e.message : String(e));
    }
  }
  return categories;
}

async function getAllLeafCategories(
  rootCategoryId: number,
  visited = new Set<number>(),
  parentPath: string[] = []
): Promise<Array<Category & { path: string[] }>> {
  const leafCategories: Array<Category & { path: string[] }> = [];
  
  async function traverse(category: Category, currentPath: string[]) {
    if (visited.has(category.id)) {
      return;
    }
    visited.add(category.id);
    
    const newPath = [...currentPath, category.name];
    
    if (category.leaf) {
      leafCategories.push({ ...category, path: newPath });
    } else if (category._embedded?.children) {
      for (const child of category._embedded.children) {
        if (!child.id) continue;
        if (typeof child.leaf === 'boolean') {
          await traverse(child as Category, newPath);
        } else {
          await delay(DELAY_BETWEEN_REQUESTS);
          try {
            const childFull = await fetchCategory(child.id);
            await traverse(childFull, newPath);
          } catch (error) {
            // 忽略错误，继续处理
          }
        }
      }
    }
  }
  
  const root = await fetchCategory(rootCategoryId);
  await traverse(root, parentPath);
  return leafCategories;
}

async function fetchCliparts(categoryId: number): Promise<Clipart[]> {
  const url = `${BASE_URL}/clipart/browse/${categoryId}.json`;
  const response = await httpGet<BrowseResponse>(url);
  return response._embedded.cliparts;
}

async function getImageUrlWithPlaywright(page: Page, clipartId: number, base64Path: string): Promise<string | null> {
  const imageUrls: string[] = [];
  const base64PathKey = base64Path.split('/').pop() || '';
  
  const responseHandler = (response: any) => {
    const url = response.url();
    if ((url.match(/\.(png|jpg|jpeg|gif|webp|svg)/i) || 
        url.includes('imgix.net') || 
        url.includes('assets/images') ||
        url.includes('clipart')) &&
        (url.includes(base64PathKey) || url.includes('clipart/assets/images'))) {
      imageUrls.push(url);
    }
  };
  
  page.on('response', responseHandler);
  
  try {
    const detailUrl = `${BASE_URL}/clipart/cliparts/${clipartId}`;
    try {
      await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await delay(2000);
    } catch (error) {
      // 忽略错误
    }
    
    try {
      const browseUrl = `${BASE_URL}/clipart/browse/${clipartId}`;
      await page.goto(browseUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await delay(2000);
    } catch (error) {
      // 忽略错误
    }
    
    await delay(2000);
    page.off('response', responseHandler);
    
    if (imageUrls.length > 0) {
      const uniqueUrls = [...new Set(imageUrls)];
      return uniqueUrls[0];
    }
    
    return null;
  } catch (error) {
    page.off('response', responseHandler);
    return null;
  }
}

async function uploadToGcs(localPath: string, gcsKey: string, contentType: string): Promise<string> {
  if (!bucket) {
    throw new Error('GCS bucket 未初始化');
  }
  
  await bucket.upload(localPath, {
    destination: gcsKey,
    metadata: {
      cacheControl: 'public, max-age=31536000, immutable',
      contentType,
    },
  });
  
  await bucket.file(gcsKey).makePublic();
  
  return `${BASE_URL_GCS}/${gcsKey}`;
}

async function generateThumbnail(inputPath: string, outputPath: string, width = 200, height = 200): Promise<void> {
  await sharp(inputPath)
    .resize(width, height, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
}

async function getOrCreateCategory(
  name: string,
  slug: string,
  parentId: string | null = null
): Promise<string> {
  let category = await prisma.artwork_categories.findUnique({
    where: { slug },
  });
  
  if (!category) {
    category = await prisma.artwork_categories.create({
      data: {
        name,
        slug,
        parent_id: parentId,
        is_active: true,
        sort_order: 0,
      },
    });
  }
  
  return category.id;
}

async function saveToDatabase(artwork: ArtworkMetadata, topCategoryId: string, subCategoryId: string): Promise<void> {
  const existing = await prisma.art_assets.findUnique({
    where: { slug: artwork.slug },
  });
  
  if (existing) {
    return; // 已存在，跳过
  }
  
  const imageUrl = artwork.gcsKey ? `${BASE_URL_GCS}/${artwork.gcsKey}` : artwork.sourceUrl;
  const thumbnailUrl = artwork.thumbnailKey ? `${BASE_URL_GCS}/${artwork.thumbnailKey}` : null;
  
  await prisma.$executeRawUnsafe(`
    INSERT INTO art_assets (
      id, category, name, slug, description, image_url, thumbnail_url,
      file_size, width, height, mime_type, is_active, sort_order,
      top_category_id, sub_category_id, gcs_key, gcs_bucket, source_url,
      tags, license, attribution, status, created_at, updated_at
    ) VALUES (
      uuid_generate_v4(), $1::varchar, $2::varchar, $3::varchar, $4::text, $5::varchar, $6::varchar,
      $7::integer, $8::integer, $9::integer, $10::varchar, $11::boolean, $12::integer,
      $13::uuid, $14::uuid, $15::varchar, $16::varchar, $17::varchar,
      $18::text[], $19::varchar, $20::text, $21::varchar, NOW(), NOW()
    )
    ON CONFLICT (slug) DO NOTHING
  `,
    artwork.topCategory || 'customink',
    artwork.title,
    artwork.slug,
    artwork.attribution || null,
    imageUrl,
    thumbnailUrl,
    null,
    artwork.width || null,
    artwork.height || null,
    artwork.mimeType,
    true,
    0,
    topCategoryId,
    subCategoryId,
    artwork.gcsKey,
    artwork.gcsKey ? BUCKET_NAME : null,
    artwork.sourceUrl,
    artwork.tags,
    artwork.license,
    artwork.attribution || null,
    'active'
  );
}

async function crawlScheduled() {
console.log(` 开始定时抓取：每小时 ${MAX_ITEMS_PER_HOUR} 个素材\n`);
  
  const state = loadState();
  console.log(`📊 上次运行: ${state.lastRunTime}`);
  console.log(`📊 已处理总数: ${state.totalProcessed}\n`);
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📋 步骤 1: 获取所有根分类...\n');
    const rootCategories = await getAllRootCategories();
    console.log(`✅ 找到 ${rootCategories.length} 个根分类\n`);
    
    console.log('📋 步骤 2: 获取所有叶子分类...\n');
    const allLeafCategories: Array<Category & { path: string[] }> = [];
    for (const rootCategory of rootCategories) {
      const leafCategories = await getAllLeafCategories(rootCategory.id);
      allLeafCategories.push(...leafCategories);
    }
    console.log(`✅ 共找到 ${allLeafCategories.length} 个叶子分类\n`);
    
    let processedThisRun = 0;
    let currentCategoryIndex = state.lastCategoryIndex;
    
    while (processedThisRun < MAX_ITEMS_PER_HOUR && currentCategoryIndex < allLeafCategories.length) {
      const category = allLeafCategories[currentCategoryIndex];
      
      if (state.processedCategories.includes(category.id)) {
        currentCategoryIndex++;
        continue;
      }
      
      try {
        const topCategory = category.path[0] || 'customink';
        const subCategory = category.path.slice(1).join('-') || category.name.toLowerCase();
        const outputDir = path.join(OUTPUT_ROOT, generateSlug(topCategory), generateSlug(subCategory));
        
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const topCategorySlug = generateSlug(topCategory);
        const subCategorySlug = generateSlug(subCategory);
        const topCategoryId = await getOrCreateCategory(topCategory, topCategorySlug);
        const subCategoryId = await getOrCreateCategory(subCategory, subCategorySlug, topCategoryId);
        
        await delay(DELAY_BETWEEN_REQUESTS);
        const cliparts = await fetchCliparts(category.id);
        
        const unprocessedCliparts = cliparts.filter(c => !state.processedClipartIds.includes(c.id));
        
        if (unprocessedCliparts.length === 0) {
          state.processedCategories.push(category.id);
          currentCategoryIndex++;
          continue;
        }
        
        console.log(`\n📥 处理分类: ${topCategory} -> ${subCategory} (${unprocessedCliparts.length} 个未处理素材)\n`);
        
        for (const clipart of unprocessedCliparts) {
          if (processedThisRun >= MAX_ITEMS_PER_HOUR) break;
          
          try {
            const title = clipart.original_filename.replace(/\.(eps|svg|png|jpg)$/i, '');
            const slug = generateSlug(title);
            const base64Path = clipart._links.self.href;
            
            console.log(`  🎨 处理: ${title} (ID: ${clipart.id})`);
            
            let imageUrl: string | null = null;
            try {
              imageUrl = await getImageUrlWithPlaywright(page, clipart.id, base64Path);
            } catch (error) {
              // 忽略错误，尝试修正路径
            }
            
            if (!imageUrl && base64Path) {
              const correctedPath = base64Path.startsWith('/assets/images/') 
                ? base64Path.replace('/assets/images/', '/clipart/assets/images/')
                : base64Path.startsWith('/clipart/assets/images/')
                ? base64Path
                : `/clipart/assets/images${base64Path}`;
              imageUrl = `${BASE_URL}${correctedPath}`;
            }
            
            if (!imageUrl) {
              console.error(`    ❌ 无法找到图片 URL`);
              state.processedClipartIds.push(clipart.id);
              continue;
            }
            
            const urlExt = imageUrl.match(/\.(png|jpg|jpeg|gif|webp)/i)?.[0] || '.png';
            const fileName = `${slug}${urlExt}`;
            const filePath = path.join(outputDir, fileName);
            
            console.log(`    📥 下载: ${imageUrl}...`);
            await downloadImage(imageUrl, filePath);
            
            const imageInfo = await sharp(filePath).metadata();
            const width = imageInfo.width || undefined;
            const height = imageInfo.height || undefined;
            
            const gcsKey = `art-asset/${topCategorySlug}/${subCategorySlug}/${slug}${urlExt}`;
            const thumbnailKey = `art-asset/${topCategorySlug}/${subCategorySlug}/thumb/${slug}@200x200.jpg`;
            
            console.log(`    📤 上传到 GCS: ${gcsKey}...`);
            const gcsImageUrl = await uploadToGcs(filePath, gcsKey, getMimeType(fileName));
            
            const thumbnailPath = path.join(outputDir, `thumb_${slug}.jpg`);
            await generateThumbnail(filePath, thumbnailPath);
            const gcsThumbnailUrl = await uploadToGcs(thumbnailPath, thumbnailKey, 'image/jpeg');
            
            fs.unlinkSync(thumbnailPath);
            
            const tags = [
              ...category.path.map(name => name.toLowerCase()),
              clipart.black_white ? 'black-white' : 'color',
              ...clipart.visible_colors.map(color => `color-${color.replace('#', '')}`),
            ];
            
            const artwork: ArtworkMetadata = {
              title,
              slug,
              sourceUrl: imageUrl,
              tags,
              license: clipart.licensed ? 'Licensed' : 'CustomInk Clipart',
              attribution: 'CustomInk',
              fileName,
              mimeType: getMimeType(fileName),
              width,
              height,
              gcsKey,
              thumbnailKey,
              categoryId: category.id,
              categoryName: category.name,
              topCategory: topCategorySlug,
              subCategory: subCategorySlug,
            };
            
            console.log(`    💾 保存到数据库...`);
            await saveToDatabase(artwork, topCategoryId, subCategoryId);
            
            state.processedClipartIds.push(clipart.id);
            processedThisRun++;
            state.totalProcessed++;
            
            console.log(`    ✅ 完成: ${gcsImageUrl}\n`);
            
            await delay(DELAY_BETWEEN_REQUESTS);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`  ❌ 处理素材失败: ${errorMessage}\n`);
            state.processedClipartIds.push(clipart.id);
          }
        }
        
        const remainingCliparts = cliparts.filter(c => !state.processedClipartIds.includes(c.id));
        if (remainingCliparts.length === 0) {
          state.processedCategories.push(category.id);
        }
        
        currentCategoryIndex++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`  ❌ 处理分类失败: ${errorMessage}\n`);
        currentCategoryIndex++;
      }
    }
    
    state.lastCategoryIndex = currentCategoryIndex;
    state.lastRunTime = new Date().toISOString();
    saveState(state);
    
    console.log(`\n✅ 本次运行完成！`);
    console.log(`📊 本次处理: ${processedThisRun} 个素材`);
    console.log(`📊 总处理数: ${state.totalProcessed} 个素材`);
    console.log(`📊 当前分类索引: ${currentCategoryIndex}/${allLeafCategories.length}\n`);
    
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

crawlScheduled().catch((error) => {
  console.error('❌ 流程失败:', error);
  process.exit(1);
});

export { crawlScheduled };

