/**
 * 上传已下载的促销产品图片到 GCS
* 将本地已下载的图片上传到 Google Cloud Storage
 */

const fs = require('fs');
const path = require('path');

// 加载 GCS 工具函数
const gcsUtilsPath = path.join(__dirname, '../backend/src/utils/gcsStorage.js');
if (!fs.existsSync(gcsUtilsPath)) {
  console.error('❌ GCS 工具文件不存在:', gcsUtilsPath);
  process.exit(1);
}

const gcsUtils = require(gcsUtilsPath);

// 本地图片目录
const IMAGES_DIR = path.join(__dirname, '../customink-images/promotional-products');

/**
 * 递归扫描目录，获取所有图片文件
 */
function getAllImageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllImageFiles(filePath, fileList);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

/**
 * 上传单个文件到 GCS
 */
async function uploadFileToGcs(localPath) {
  try {
    // 获取相对路径
    const relativePath = path.relative(IMAGES_DIR, localPath);
    const pathParts = relativePath.split(path.sep);
    const category = pathParts[0] || 'misc';
    const fileName = pathParts[pathParts.length - 1];
    
    // 构建 GCS 对象路径
    const objectPath = gcsUtils.buildObjectPath('promotional-products', [category, fileName]);
    
    // 获取 Content-Type
    const ext = path.extname(fileName).toLowerCase();
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    const contentType = contentTypeMap[ext] || 'image/png';
    
    // 检查文件是否已存在于 GCS
    const bucketName = gcsUtils.getImageBucketName();
    const storage = gcsUtils.getStorageClient();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectPath);
    
    const [exists] = await file.exists();
    if (exists) {
      const baseUrl = gcsUtils.getImageBaseUrl();
      return `${baseUrl}/${objectPath}`; // 返回已存在的 URL
    }
    
    // 上传到 GCS
    const publicUrl = await gcsUtils.uploadFileToGcs(localPath, objectPath, {
      contentType: contentType,
      cacheControl: 'public, max-age=31536000, immutable'
    });
    
    // 设置文件为公共可读
    try {
      await file.makePublic();
    } catch (error) {
      console.warn(`      ⚠️  设置公开权限失败: ${error.message}`);
    }
    
    return publicUrl;
  } catch (error) {
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始上传促销产品图片到 GCS...\n');
  
  // 检查 GCS 配置
  try {
    const bucketName = gcsUtils.getImageBucketName();
    console.log(`📦 GCS Bucket: ${bucketName}`);
    console.log(`📁 本地目录: ${IMAGES_DIR}\n`);
  } catch (error) {
    console.error('❌ GCS 配置错误:', error.message);
    console.error('   请设置环境变量: GCP_IMAGE_BUCKET');
    process.exit(1);
  }
  
  // 检查本地目录是否存在
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ 本地图片目录不存在: ${IMAGES_DIR}`);
    process.exit(1);
  }
  
  // 获取所有图片文件
  console.log('🔍 扫描本地图片文件...\n');
  const imageFiles = getAllImageFiles(IMAGES_DIR);
  console.log(`   找到 ${imageFiles.length} 个图片文件\n`);
  
  if (imageFiles.length === 0) {
    console.log('⚠️  未找到任何图片文件');
    return;
  }
  
  // 上传图片
  console.log('📤 开始上传到 GCS...\n');
  
  let uploadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const results = [];
  
  for (let i = 0; i < imageFiles.length; i++) {
    const filePath = imageFiles[i];
    const relativePath = path.relative(IMAGES_DIR, filePath);
    
    try {
      console.log(`   [${i + 1}/${imageFiles.length}] ${relativePath}`);
      const gcsUrl = await uploadFileToGcs(filePath);
      
      if (gcsUrl) {
        const stats = fs.statSync(filePath);
        results.push({
          localPath: filePath,
          relativePath: relativePath,
          gcsUrl: gcsUrl,
          fileSize: stats.size,
          status: 'success'
        });
        
        uploadedCount++;
        console.log(`      ✅ 成功: ${gcsUrl}`);
      } else {
        skippedCount++;
        console.log(`      ⏭️  已存在，跳过`);
      }
    } catch (error) {
      errorCount++;
      results.push({
        localPath: filePath,
        relativePath: relativePath,
        status: 'failed',
        error: error.message
      });
      console.log(`      ❌ 失败: ${error.message}`);
    }
    
    // 添加延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // 输出统计
  console.log('\n✅ 上传完成！');
  console.log(`   - 总文件数: ${imageFiles.length}`);
  console.log(`   - 上传成功: ${uploadedCount} 个`);
  console.log(`   - 已存在: ${skippedCount} 个`);
  console.log(`   - 上传失败: ${errorCount} 个`);
  
  // 保存结果到 JSON 文件
  const outputPath = path.join(__dirname, '../docs/customink-analysis/gcs-upload-results.json');
  const output = {
    timestamp: new Date().toISOString(),
    bucket: gcsUtils.getImageBucketName(),
    totalFiles: imageFiles.length,
    uploadedCount: uploadedCount,
    skippedCount: skippedCount,
    errorCount: errorCount,
    results: results
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n📄 结果已保存到: ${outputPath}\n`);
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  });
}

module.exports = { uploadFileToGcs, getAllImageFiles };

