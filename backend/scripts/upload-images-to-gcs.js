/**
 * 上传本地图片到 GCP Cloud Storage
* 将所有本地图片文件上传到 GCS bucket
 */

const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

// GCS 配置
const BUCKET_NAME = 'print-main-assets';
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'moonlit-gamma-479502-r6';
const ASSETS_DIR = path.join(__dirname, '../../apps/web/public/assets');

// 初始化 GCS
const storage = new Storage({ projectId: PROJECT_ID });
const bucket = storage.bucket(BUCKET_NAME);

// 上传单个文件到 GCS
async function uploadFile(localPath, gcsPath) {
  try {
    await bucket.upload(localPath, {
      destination: gcsPath,
      metadata: {
        cacheControl: 'public, max-age=31536000', // 1年缓存
      },
    });
    
    // 设置文件为公共可读
    await bucket.file(gcsPath).makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${gcsPath}`;
    return publicUrl;
  } catch (error) {
    console.error(`  ❌ 上传失败 ${gcsPath}:`, error.message);
    throw error;
  }
}

// 递归扫描目录并上传所有图片文件
async function uploadDirectory(localDir, gcsPrefix = '') {
  const files = fs.readdirSync(localDir, { withFileTypes: true });
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];
  let uploadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const localPath = path.join(localDir, file.name);
    const gcsPath = path.join(gcsPrefix, file.name).replace(/\\/g, '/');

    if (file.isDirectory()) {
      // 递归处理子目录
      const result = await uploadDirectory(localPath, gcsPath);
      uploadedCount += result.uploaded;
      skippedCount += result.skipped;
      errorCount += result.errors;
    } else if (file.isFile()) {
      const ext = path.extname(file.name).toLowerCase();
      
      if (imageExtensions.includes(ext)) {
        try {
          // 检查文件是否已存在（可选：跳过已存在的文件）
          const [exists] = await bucket.file(gcsPath).exists();
          
          if (exists) {
            console.log(`  ⏭️  已存在: ${gcsPath}`);
            skippedCount++;
          } else {
            const publicUrl = await uploadFile(localPath, gcsPath);
            console.log(`  ✅ 已上传: ${gcsPath}`);
            console.log(`     URL: ${publicUrl}`);
            uploadedCount++;
          }
        } catch (error) {
          console.error(`  ❌ 错误: ${gcsPath}`, error.message);
          errorCount++;
        }
      } else {
        skippedCount++;
      }
    }
  }

  return { uploaded: uploadedCount, skipped: skippedCount, errors: errorCount };
}

// 主函数
async function main() {
  console.log('🚀 开始上传图片到 GCP Cloud Storage...\n');
  console.log(`📦 Bucket: ${BUCKET_NAME}`);
  console.log(`📁 本地目录: ${ASSETS_DIR}\n`);

  // 检查本地目录是否存在
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error(`❌ 错误: 本地目录不存在: ${ASSETS_DIR}`);
    process.exit(1);
  }

  try {
    // 检查 bucket 是否存在
    const [exists] = await bucket.exists();
    if (!exists) {
      console.error(`❌ 错误: Bucket 不存在: ${BUCKET_NAME}`);
      console.log(`   请先创建 bucket: gsutil mb -p ${PROJECT_ID} -l us-central1 gs://${BUCKET_NAME}`);
      process.exit(1);
    }

    console.log('✅ Bucket 存在，开始上传...\n');

    // 上传各个子目录
    const subdirs = ['products', 'brands', 'categories'];
    let totalUploaded = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const subdir of subdirs) {
      const localSubdir = path.join(ASSETS_DIR, subdir);
      
      if (!fs.existsSync(localSubdir)) {
        console.log(`⚠️  目录不存在，跳过: ${subdir}/`);
        continue;
      }

      console.log(`📂 上传目录: ${subdir}/`);
      const result = await uploadDirectory(localSubdir, subdir);
      totalUploaded += result.uploaded;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
      console.log(`   完成: 上传 ${result.uploaded}, 跳过 ${result.skipped}, 错误 ${result.errors}\n`);
    }

    console.log('\n✨ 上传完成！');
    console.log(`   - 总计上传: ${totalUploaded} 个文件`);
    console.log(`   - 总计跳过: ${totalSkipped} 个文件`);
    console.log(`   - 总计错误: ${totalErrors} 个文件`);
    console.log(`\n📦 Bucket URL: https://storage.googleapis.com/${BUCKET_NAME}/`);

  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .catch(error => {
      console.error('❌ 执行失败:', error);
      process.exit(1);
    });
}

module.exports = { uploadDirectory, uploadFile };

