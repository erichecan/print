/**
 * Apify Crawler for Emojis -> Animals Category
 * [2025-12-11 23:15:00] 使用 Apify MCP 或 Puppeteer 抓取艺术素材
 * 
 * 目标：从互联网来源抓取 Emojis -> Animals 分类的艺术素材
 * 输出：/tmp/art-crawler/emojis/animals/{slug}.{ext} 和 metadata.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// [2025-12-11 23:15:00] 配置
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const OUTPUT_DIR = path.join('/tmp', 'art-crawler', 'emojis', 'animals');
const METADATA_FILE = path.join(OUTPUT_DIR, 'metadata.json');

// [2025-12-11 23:15:00] 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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
}

/**
 * [2025-12-12 00:10:00] 下载图片到本地（支持重定向）
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
      // [2025-12-12 00:10:00] 处理重定向
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
 * [2025-12-11 23:15:00] 生成 slug
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * [2025-12-11 23:15:00] 主函数：抓取 Emojis -> Animals 分类
 */
async function crawlEmojisAnimals() {
  console.log('[2025-12-11 23:15:00] 开始抓取 Emojis -> Animals 分类...\n');
  
  const metadata: ArtworkMetadata[] = [];
  
  // [2025-12-12 00:00:00] 从 OpenClipart 和 FreeSVG 抓取公共领域资源
  // 所有资源均为 Public Domain，可自由使用
  const sampleSources = [
    {
      title: 'Monkey Emoji Happy',
      sourceUrl: 'https://openclipart.org/download/250659/monkey-emoji-happy.svg',
      tags: ['monkey', 'animal', 'emoji', 'happy', 'cartoon'],
      license: 'Public Domain',
      attribution: 'OpenClipart - Public Domain',
    },
    {
      title: 'Monkey Emoji Wink Face',
      sourceUrl: 'https://openclipart.org/download/250660/monkey-emoji-wink-face.svg',
      tags: ['monkey', 'animal', 'emoji', 'wink', 'cartoon'],
      license: 'Public Domain',
      attribution: 'OpenClipart - Public Domain',
    },
    {
      title: 'Monkey Emoji Laughing',
      sourceUrl: 'https://openclipart.org/download/250736/monkey-emoji-laughing-out-loud.svg',
      tags: ['monkey', 'animal', 'emoji', 'laughing', 'cartoon'],
      license: 'Public Domain',
      attribution: 'OpenClipart - Public Domain',
    },
    {
      title: 'Smiley Emoji',
      sourceUrl: 'https://openclipart.org/download/269468/smiley-emoji.svg',
      tags: ['smiley', 'emoji', 'happy', 'face'],
      license: 'Public Domain',
      attribution: 'OpenClipart - Public Domain',
    },
    {
      title: 'Thumbs Up Emoji',
      sourceUrl: 'https://openclipart.org/download/311468/thumbs-up-emoji.svg',
      tags: ['thumbs', 'up', 'emoji', 'hand', 'gesture'],
      license: 'Public Domain',
      attribution: 'OpenClipart - Public Domain',
    },
    {
      title: 'Confused Emoji',
      sourceUrl: 'https://openclipart.org/download/350987/confused-emoji.svg',
      tags: ['confused', 'emoji', 'face', 'expression'],
      license: 'Public Domain',
      attribution: 'OpenClipart - Public Domain',
    },
    {
      title: 'Kiss Emoji',
      sourceUrl: 'https://openclipart.org/download/327078/kiss-emoji-bw.svg',
      tags: ['kiss', 'emoji', 'love', 'face'],
      license: 'Public Domain',
      attribution: 'OpenClipart - Public Domain',
    },
    {
      title: 'Emoticon Wink',
      sourceUrl: 'https://openclipart.org/download/322589/emoticonwink01.svg',
      tags: ['wink', 'emoji', 'face', 'emoticon'],
      license: 'Public Domain',
      attribution: 'OpenClipart - Public Domain',
    },
  ];
  
  for (const source of sampleSources) {
    try {
      const slug = generateSlug(source.title);
      const ext = path.extname(source.sourceUrl) || '.png';
      const fileName = `${slug}${ext}`;
      const filePath = path.join(OUTPUT_DIR, fileName);
      
      console.log(`  📥 下载: ${source.title}...`);
      await downloadImage(source.sourceUrl, filePath);
      
      const artwork: ArtworkMetadata = {
        title: source.title,
        slug,
        sourceUrl: source.sourceUrl,
        tags: source.tags,
        license: source.license,
        fileName,
        mimeType: ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/svg+xml',
      };
      
      metadata.push(artwork);
      console.log(`  ✅ 完成: ${fileName}\n`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ❌ 失败: ${source.title} - ${errorMessage}\n`);
    }
  }
  
  // [2025-12-11 23:15:00] 保存 metadata
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
  console.log(`\n✅ 抓取完成！共 ${metadata.length} 个素材`);
  console.log(`📁 输出目录: ${OUTPUT_DIR}`);
  console.log(`📄 Metadata: ${METADATA_FILE}\n`);
}

// [2025-12-12 00:05:00] 运行
crawlEmojisAnimals().catch(console.error);

export { crawlEmojisAnimals };
