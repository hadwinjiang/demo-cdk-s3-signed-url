/**
 * S3 Path Parser Module
 * Parses S3 URIs in the format s3://bucket-name/path/to/object
 * and extracts bucket name and object key with validation.
 */

/**
 * Validates an S3 bucket name according to AWS naming rules
 * @param {string} bucket - The bucket name to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidBucketName(bucket) {
  if (!bucket || typeof bucket !== 'string') {
    return false;
  }

  // Bucket name length must be between 3 and 63 characters
  if (bucket.length < 3 || bucket.length > 63) {
    return false;
  }

  // Bucket names must start and end with a lowercase letter or number
  if (!/^[a-z0-9]/.test(bucket) || !/[a-z0-9]$/.test(bucket)) {
    return false;
  }

  // Bucket names can only contain lowercase letters, numbers, hyphens, and dots
  if (!/^[a-z0-9.-]+$/.test(bucket)) {
    return false;
  }

  // Bucket names must not contain two adjacent periods
  if (bucket.includes('..')) {
    return false;
  }

  // Bucket names must not be formatted as an IP address
  if (/^\d+\.\d+\.\d+\.\d+$/.test(bucket)) {
    return false;
  }

  return true;
}

/**
 * Validates an S3 object key
 * @param {string} key - The object key to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidObjectKey(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }

  // Key cannot be empty or only whitespace
  if (key.trim().length === 0) {
    return false;
  }

  // Key length must not exceed 1024 bytes (UTF-8)
  const byteLength = Buffer.byteLength(key, 'utf8');
  if (byteLength > 1024) {
    return false;
  }

  return true;
}

/**
 * Parses an S3 path and extracts bucket name and object key
 * @param {string} s3Path - The S3 path in format s3://bucket-name/path/to/object
 * @returns {Object} - Result object with success flag and data or error
 */
function parseS3Path(s3Path) {
  // Validate input
  if (!s3Path || typeof s3Path !== 'string') {
    return {
      success: false,
      error: 'Invalid input',
      message: 'S3 path must be a non-empty string'
    };
  }

  // Trim whitespace
  const trimmedPath = s3Path.trim();

  if (trimmedPath.length === 0) {
    return {
      success: false,
      error: 'Invalid input',
      message: 'S3 path cannot be empty or only whitespace'
    };
  }

  // Check for s3:// protocol
  if (!trimmedPath.startsWith('s3://')) {
    return {
      success: false,
      error: 'Invalid S3 path format',
      message: 'S3 path must start with s3:// protocol'
    };
  }

  // Remove s3:// prefix
  const pathWithoutProtocol = trimmedPath.substring(5);

  // Find the first slash to separate bucket from key
  const firstSlashIndex = pathWithoutProtocol.indexOf('/');

  if (firstSlashIndex === -1) {
    return {
      success: false,
      error: 'Invalid S3 path format',
      message: 'S3 path must include object key after bucket name (s3://bucket-name/key)'
    };
  }

  if (firstSlashIndex === 0) {
    return {
      success: false,
      error: 'Invalid S3 path format',
      message: 'Bucket name cannot be empty'
    };
  }

  // Extract bucket and key
  const bucket = pathWithoutProtocol.substring(0, firstSlashIndex);
  const key = pathWithoutProtocol.substring(firstSlashIndex + 1);

  // Validate bucket name
  if (!isValidBucketName(bucket)) {
    return {
      success: false,
      error: 'Invalid bucket name',
      message: 'Bucket name must be 3-63 characters, contain only lowercase letters, numbers, hyphens, and dots, and follow AWS S3 naming rules'
    };
  }

  // Validate object key
  if (!isValidObjectKey(key)) {
    return {
      success: false,
      error: 'Invalid object key',
      message: 'Object key cannot be empty and must not exceed 1024 bytes'
    };
  }

  return {
    success: true,
    data: {
      bucket,
      key
    }
  };
}

/**
 * Formats bucket and key into an S3 path
 * @param {string} bucket - The bucket name
 * @param {string} key - The object key
 * @returns {string} - The formatted S3 path
 */
function formatS3Path(bucket, key) {
  return `s3://${bucket}/${key}`;
}

module.exports = {
  parseS3Path,
  formatS3Path,
  isValidBucketName,
  isValidObjectKey
};
