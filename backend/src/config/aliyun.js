// Aliyun OSS configuration for file storage
const OSS = require('ali-oss');
require('dotenv').config();

const client = new OSS({
  region: process.env.ALIYUN_OSS_REGION || 'oss-us-east-1',
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
  bucket: process.env.ALIYUN_OSS_BUCKET || 'suvernire-plus'
});

// Upload file to OSS
const uploadToOSS = async (file, key, contentType) => {
  try {
    const result = await client.put(key, file, {
      'Content-Type': contentType
    });

    return result.url;
  } catch (error) {
    console.error('OSS upload error:', error);
    throw error;
  }
};

// Delete file from OSS
const deleteFromOSS = async (key) => {
  try {
    await client.delete(key);
    return true;
  } catch (error) {
    console.error('OSS delete error:', error);
    throw error;
  }
};

// Get signed URL for private files
const getSignedUrl = async (key, expiresIn = 3600) => {
  try {
    return client.signatureUrl(key, { expires: expiresIn });
  } catch (error) {
    console.error('OSS signed URL error:', error);
    throw error;
  }
};

module.exports = {
  client,
  uploadToOSS,
  deleteFromOSS,
  getSignedUrl
};

