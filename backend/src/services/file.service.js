const { s3, S3_CONFIG } = require('../config/aws');
const { logger } = require('../utils/logger');

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} fileName - The name of the file
 * @param {string} prefix - The S3 prefix (folder path)
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<string>} - The URL of the uploaded file
 */
const uploadFile = async (fileBuffer, fileName, prefix, contentType) => {
  try {
    if (!fileBuffer) {
      throw new Error('File buffer is required');
    }

    if (!fileName) {
      throw new Error('File name is required');
    }

    // Create S3 key (path in bucket)
    const key = `${prefix || ''}${fileName}`;

    // Upload file to S3
    await s3.putObject({
      Bucket: S3_CONFIG.BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType || 'application/octet-stream',
    }).promise();

    // Return the URL of the uploaded file
    return `https://${S3_CONFIG.BUCKET}.s3.amazonaws.com/${key}`;
  } catch (error) {
    logger.error('Error uploading file to S3:', error);
    throw error;
  }
};

/**
 * Upload a file from a base64 string
 * @param {string} base64String - The base64 encoded file
 * @param {string} fileName - The name of the file
 * @param {string} prefix - The S3 prefix (folder path)
 * @returns {Promise<string>} - The URL of the uploaded file
 */
const uploadBase64File = async (base64String, fileName, prefix) => {
  try {
    if (!base64String) {
      throw new Error('Base64 string is required');
    }

    // Extract file data and content type from base64 string
    const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 format');
    }

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    
    // Generate file extension from content type if not provided in fileName
    if (!fileName.includes('.')) {
      const extension = contentType.split('/')[1];
      fileName = `${fileName}.${extension}`;
    }

    // Upload file
    return await uploadFile(buffer, fileName, prefix, contentType);
  } catch (error) {
    logger.error('Error uploading base64 file to S3:', error);
    throw error;
  }
};

/**
 * Delete a file from S3
 * @param {string} fileUrl - The URL of the file to delete
 * @returns {Promise<void>}
 */
const deleteFile = async (fileUrl) => {
  try {
    if (!fileUrl) {
      throw new Error('File URL is required');
    }

    // Extract key from URL
    const urlParts = fileUrl.split('.s3.amazonaws.com/');
    if (urlParts.length !== 2) {
      throw new Error('Invalid S3 URL format');
    }

    const key = urlParts[1];

    // Delete file from S3
    await s3.deleteObject({
      Bucket: S3_CONFIG.BUCKET,
      Key: key
    }).promise();
  } catch (error) {
    logger.error('Error deleting file from S3:', error);
    throw error;
  }
};

module.exports = {
  uploadFile,
  uploadBase64File,
  deleteFile
}; 