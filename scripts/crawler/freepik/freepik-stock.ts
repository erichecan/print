/**
 * Freepik Stock Content API Crawler
* 使用 Freepik API 按分类爬取素材，每个分类至少 20 个
 * 
 * 用法: ts-node scripts/crawler/freepik/freepik-stock.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// 配置
const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY || 'FPSXf8c495dd8d76fb0b2dfda9263c28d3db';
const OUTPUT_ROOT = path.join('/tmp', 'art-crawler');
const MIN_ITEMS_PER_CATEGORY = 20;

// 分类配置：topCategory / subCategory / 搜索词
const CATEGORIES = [
  { top: 'freepik', sub: 'emojis-animals', term: 'animal emoji vector' },
  { top: 'freepik', sub: 'emojis-faces', term: 'smiley emoji vector' },
  { top: 'freepik', sub: 'icons-business', term: 'business icon vector' },
  { top: 'freepik', sub: 'icons-technology', term: 'technology icon vector' },
  { top: 'freepik', sub: 'shapes-geometric', term: 'geometric shapes vector' },
];

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
}

interface FreepikResource {
  id: number;
  title: string;
  url?: string;
  licenses?: Array<{ type: string; url?: string }>;
  image?: {
    type?: string;
    orientation?: string;
    source?: {
      key?: string;
      url: string;
      size?: string;
    };
  };
  author?: {
    id?: number;
    name: string;
    avatar?: string;
    slug?: string;
  };
  filename?: string;
  meta?: {
    published_at?: string;
    is_new?: boolean;
  };
}

interface FreepikApiResponse {
  data?: FreepikResource[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

/**
* 生成 slug
 */
function generateSlug(title: string, id: number): string {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${id}`;
}

/**
* 下载图片到本地（支持重定向）
 */
function downloadImage(url: string, filePath: string, redirectCount = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error('Too many redirects'));
      return;
    }
    
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filePath);
    
    const request = protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        file.close();
        fs.unlink(filePath, () => {});
        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
          reject(new Error(`Redirect without location: ${url}`));
          return;
        }
        const absoluteUrl = redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, url).toString();
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
  });
}

/**
* 调用 Freepik API
 */
async function fetchFreepikResources(term: string, page: number, limit: number): Promise<FreepikApiResponse> {
  return new Promise((resolve, reject) => {
// 修复：使用 type 参数而不是 filters（根据 Freepik API 文档）
    const params = new URLSearchParams({
      term,
      page: String(page),
      limit: String(limit),
      order: 'relevance',
type: 'vector', // 使用 type 参数过滤矢量资源
    });

    const url = `https://api.freepik.com/v1/resources?${params.toString()}`;
    
    const options = {
      headers: {
        'x-freepik-api-key': FREEPIK_API_KEY,
      },
    };

    https.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
            return;
          }
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          reject(new Error(`Parse error: ${error instanceof Error ? error.message : String(error)}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
* 爬取单个分类
 */
async function crawlCategory({ top, sub, term }: { top: string; sub: string; term: string }) {
  console.log(`\n[Freepik] 开始分类: ${top} -> ${sub}（term="${term}"）\n`);

  const categoryDir = path.join(OUTPUT_ROOT, top, sub);
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true });
  }
  const metadataFile = path.join(categoryDir, 'metadata.json');

  const metadata: ArtworkMetadata[] = [];
  let page = 1;
  const limit = 50;

  while (metadata.length < MIN_ITEMS_PER_CATEGORY) {
    try {
      console.log(`  📥 请求第 ${page} 页（已收集 ${metadata.length}/${MIN_ITEMS_PER_CATEGORY}）...`);
      
      const response = await fetchFreepikResources(term, page, limit);
      const items = response.data || [];

      if (items.length === 0) {
        console.log(`  ⚠️  没有更多结果了`);
        break;
      }

      for (const item of items) {
        if (metadata.length >= MIN_ITEMS_PER_CATEGORY) break;

        const id = item.id;
        const title = item.title || `Freepik Resource ${id}`;
        const slug = generateSlug(title, id);

// 获取图片 URL
        const imageUrl = item.image?.source?.url;
        if (!imageUrl) {
          console.log(`  ⚠️  跳过（无图片 URL）: ${title}`);
          continue;
        }

// 提取标签和授权信息
        const licenseType = item.licenses?.[0]?.type || 'freemium';
        const authorName = item.author?.name || 'Unknown';
        const tags = [term, ...(item.image?.type ? [item.image.type] : [])];

// 确定文件扩展名
        const urlExt = path.extname(new URL(imageUrl).pathname) || '.jpg';
        const fileName = `${slug}${urlExt}`;
        const filePath = path.join(categoryDir, fileName);

        try {
// 下载图片到本地
          await downloadImage(imageUrl, filePath);
          
          const artwork: ArtworkMetadata = {
            title,
            slug,
            sourceUrl: imageUrl,
            tags,
            license: licenseType === 'freemium' ? 'Freemium' : licenseType,
            attribution: `Freepik - ${authorName}`,
            fileName,
            mimeType: urlExt === '.svg' ? 'image/svg+xml' : urlExt === '.png' ? 'image/png' : 'image/jpeg',
          };

          metadata.push(artwork);
          console.log(`  ✅ 完成: ${title}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`  ❌ 下载失败: ${title} - ${errorMessage}`);
        }
      }

      page += 1;
      
// 避免无限循环
      if (page > 10) {
        console.log(`  ⚠️  已达到最大页数限制（10页）`);
        break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ API 请求失败: ${errorMessage}`);
      break;
    }
  }

// 保存 metadata
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');
  console.log(`\n✅ 分类 ${top} -> ${sub} 完成: 共 ${metadata.length} 个素材`);
  console.log(`📁 输出目录: ${categoryDir}`);
  console.log(`📄 Metadata: ${metadataFile}\n`);
}

/**
* 主函数
 */
async function main() {
  console.log('[Freepik] 开始爬取素材...');
  console.log(`使用 API key: ${FREEPIK_API_KEY.slice(0, 6)}******`);
  console.log(`目标: 每个分类至少 ${MIN_ITEMS_PER_CATEGORY} 个素材\n`);

  for (const category of CATEGORIES) {
    try {
      await crawlCategory(category);
// 添加延迟，避免 API 限流
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ 分类 ${category.top} -> ${category.sub} 失败: ${errorMessage}\n`);
    }
  }

  console.log('\n✅ Freepik 爬取完成！\n');
}

// 运行
main().catch((error) => {
  console.error('❌ 脚本执行失败:', error);
  process.exit(1);
});

export { crawlCategory };
