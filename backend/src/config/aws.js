// [2025-11-02 20:52:00] AWS S3 configuration for file storage
const AWS = require('aws-sdk');
require('dotenv').config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'suvernire-plus-uploads';

// Upload file to S3
const uploadToS3 = async (file, key, contentType) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: 'public-read' // or 'private' depending on requirements
    };

    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
};

// Delete file from S3
const deleteFromS3 = async (key) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(params).promise();
    return true;
  } catch (error) {
    console.error('S3 delete error:', error);
    throw error;
  }
};

// Get signed URL for private files
const getSignedUrl = async (key, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn
    };

    return s3.getSignedUrl('getObject', params);
  } catch (error) {
    console.error('S3 signed URL error:', error);
    throw error;
  }
};

// [2025-11-11 15:18:42] Generate pre-signed PUT URL for direct browser uploads
const getUploadSignedUrl = async ({ key, contentType, expiresIn = 600 }) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn,
      ContentType: contentType,
      ACL: 'private'
    };

    const url = await s3.getSignedUrlPromise('putObject', params);
    return {
      uploadUrl: url,
      fileUrl: `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`
    };
  } catch (error) {
    console.error('[2025-11-11 15:18:42] getUploadSignedUrl error:', error);
    throw error;
  }
};

module.exports = {
  s3,
  uploadToS3,
  deleteFromS3,
  getSignedUrl,
  getUploadSignedUrl,
  BUCKET_NAME
};

