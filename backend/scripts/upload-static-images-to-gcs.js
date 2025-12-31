/**
* 一次性脚本：将本地静态图片上传到 GCP Cloud Storage
 * 
 * 覆盖范围：
 * - apps/web/public/assets/products/**     -> product/{slug}/{filename}
 * - apps/web/public/assets/brands/**      -> brand/{filename}
 * - apps/web/public/assets/categories/**  -> category/{filename}
 * - apps/web/public/assets/hero/**        -> hero/{filename}
 * 
 * 使用方式（本地或有 gcloud 权限的环境）：
 *   NODE_ENV=production \
 *   GCP_IMAGE_BUCKET=print-main-product-images \
 *   node backend/scripts/upload-static-images-to-gcs.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  uploadFileToGcs,
  buildObjectPath,
  getImageBucketName,
  getImageBaseUrl,
} = require('../src/utils/gcsStorage');

const ROOT_DIR = path.join(__dirname, '../..');
const WEB_PUBLIC_ASSETS = path.join(
  ROOT_DIR,
  'apps/web/public/assets'
);

function walkDir(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  return results;
}

function relativeFromAssets(fullPath) {
  return fullPath.replace(WEB_PUBLIC_ASSETS, '').replace(/^\/+/, '');
}

function inferTypeAndSegments(relPath) {
  const parts = relPath.split('/').filter(Boolean);
  if (!parts.length) return { type: 'misc', segments: [relPath] };

  const [top, ...rest] = parts;
  switch (top) {
    case 'products': {
      const [slug, ...files] = rest;
      return {
        type: 'product',
        segments: [slug || 'unknown', ...files],
      };
    }
    case 'brands':
      return { type: 'brand', segments: rest };
    case 'categories':
      return { type: 'category', segments: rest };
    case 'hero':
      return { type: 'hero', segments: rest };
    default:
      return { type: 'static', segments: parts };
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log(
` 🔧 开始上传本地静态图片到 GCS... (${startedAt})`
  );

  try {
    const bucket = getImageBucketName();
    const baseUrl = getImageBaseUrl();
    console.log(
` 目标 Bucket: ${bucket}, 基础 URL: ${baseUrl}`
    );

    const allFiles = walkDir(WEB_PUBLIC_ASSETS).filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(
        ext
      );
    });

    console.log(
` 在 apps/web/public/assets 下找到 ${allFiles.length} 个图片文件`
    );

    let successCount = 0;
    let failCount = 0;

    for (const filePath of allFiles) {
      const rel = relativeFromAssets(filePath);
      const { type, segments } = inferTypeAndSegments(rel);
      const objectPath = buildObjectPath(type, segments);

      console.log(
` 上传文件: ${rel} -> ${objectPath}`
      );

      try {
        const publicUrl = await uploadFileToGcs(filePath, objectPath);
        successCount += 1;
        console.log(
` ✅ 成功: ${rel} => ${publicUrl}`
        );
      } catch (err) {
        failCount += 1;
        console.error(
` ❌ 失败: ${rel} => ${objectPath}`,
          err.message
        );
      }
    }

console.log('\n 📊 上传完成统计:');
    console.log(`  ✅ 成功: ${successCount}`);
    console.log(`  ❌ 失败: ${failCount}`);
  } catch (error) {
    console.error(
' ❌ 上传过程出现致命错误:',
      error
    );
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main().then(() => {
console.log(' 🎉 静态图片上传脚本执行结束');
  });
}


