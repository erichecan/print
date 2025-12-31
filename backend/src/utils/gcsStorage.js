/**
 * GCS Storage Helper
* 提供统一的 GCP Cloud Storage 客户端与 URL 构建工具
 */

const { Storage } = require('@google-cloud/storage');

let storageClient = null;

/**
* 获取或初始化全局 Storage 客户端
 * 使用应用默认凭证（Application Default Credentials）
 */
function getStorageClient() {
  if (!storageClient) {
    storageClient = new Storage();
  }
  return storageClient;
}

/**
* 获取图片 Bucket 名称（必须配置）
 */
function getImageBucketName() {
  const bucket = process.env.GCP_IMAGE_BUCKET;
  if (!bucket) {
    throw new Error(
' GCS 配置缺失: 请在环境变量中设置 GCP_IMAGE_BUCKET'
    );
  }
  return bucket;
}

/**
* 获取图片访问基础 URL
 * 优先使用 GCP_IMAGE_BASE_URL，其次使用 storage.googleapis.com 默认域名
 */
function getImageBaseUrl() {
  const bucket = getImageBucketName();
  const base =
    process.env.GCP_IMAGE_BASE_URL ||
    `https://storage.googleapis.com/${bucket}`;
  return base.replace(/\/$/, '');
}

/**
* 构建统一的对象路径
 * type: 'product' | 'art-asset' | 'design' | 'upload' | 'brand' | 'hero' | 'category' 等
 */
function buildObjectPath(type, segments = []) {
  const safeType = type || 'misc';
  const parts = [safeType, ...segments]
    .filter(Boolean)
    .map((p) => p.toString().replace(/^\/+|\/+$/g, ''));
  return parts.join('/');
}

/**
* 上传本地文件到 GCS，并返回公开访问 URL
 */
async function uploadFileToGcs(localPath, objectPath, options = {}) {
  const client = getStorageClient();
  const bucketName = getImageBucketName();
  const bucket = client.bucket(bucketName);

  const uploadOptions = {
    destination: objectPath,
    resumable: false,
    metadata: {
      cacheControl:
        options.cacheControl || 'public, max-age=31536000, immutable',
      contentType: options.contentType || undefined,
    },
  };

  await bucket.upload(localPath, uploadOptions);

  const baseUrl = getImageBaseUrl();
  return `${baseUrl}/${objectPath}`;
}

module.exports = {
  getStorageClient,
  getImageBucketName,
  getImageBaseUrl,
  buildObjectPath,
  uploadFileToGcs,
};


