const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { parseS3Path, isValidBucketName, isValidObjectKey } = require('./s3PathParser');

// Validate required credential environment variables
const OWNER_ACCESS_KEY = process.env.Owner_Access_Key;
const OWNER_SECRET_KEY = process.env.Owner_Secret_KEY;

if (!OWNER_ACCESS_KEY || !OWNER_SECRET_KEY) {
  throw new Error('Missing required credential environment variables: Owner_Access_Key and Owner_Secret_KEY must be configured');
}

// Initialize S3 client with AKSK credentials
const s3Client = new S3Client({
  credentials: {
    accessKeyId: OWNER_ACCESS_KEY,
    secretAccessKey: OWNER_SECRET_KEY,
  },
});

const EXPIRATION = parseInt(process.env.SIGNED_URL_EXPIRATION || '3600');

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Parse request body with error handling
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Invalid request body',
          message: 'Request body must be valid JSON',
        }),
      };
    }
    
    const { s3Path, bucket: providedBucket, key: providedKey } = body;

    let bucket;
    let objectKey;

    // Extract bucket and key from s3Path or use provided bucket/key
    if (s3Path) {
      // Parse s3://bucket/key format
      const parseResult = parseS3Path(s3Path);
      
      if (!parseResult.success) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: parseResult.error,
            message: parseResult.message,
          }),
        };
      }

      bucket = parseResult.data.bucket;
      objectKey = parseResult.data.key;
    } else if (providedBucket && providedKey) {
      // Validate bucket name
      if (!isValidBucketName(providedBucket)) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: 'Invalid bucket name',
            message: 'Bucket name must be 3-63 characters, contain only lowercase letters, numbers, hyphens, and dots, and follow AWS S3 naming rules',
          }),
        };
      }

      // Validate object key
      if (!isValidObjectKey(providedKey)) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: 'Invalid object key',
            message: 'Object key cannot be empty and must not exceed 1024 bytes',
          }),
        };
      }

      bucket = providedBucket;
      objectKey = providedKey;
    } else {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Missing required parameters',
          message: 'Must provide either s3Path (format: s3://bucket-name/key) or both bucket and key parameters',
        }),
      };
    }

    // Create command for GetObject
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    });

    // Generate signed URL
    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: EXPIRATION,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        signedUrl,
        bucket,
        key: objectKey,
        expiresIn: EXPIRATION,
      }),
    };
  } catch (error) {
    console.error('Error generating signed URL:', {
      errorName: error.name,
      errorCode: error.Code,
      errorMessage: error.message,
      bucket: error.$metadata?.httpStatusCode ? 'redacted' : undefined,
    });
    
    // Handle AWS permission errors (403 Forbidden)
    if (error.name === 'AccessDenied' || 
        error.Code === 'AccessDenied' || 
        error.name === 'Forbidden' ||
        error.$metadata?.httpStatusCode === 403) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Access denied',
          message: 'Insufficient permissions to access the specified S3 bucket',
        }),
      };
    }
    
    // Handle AWS resource not found errors (404)
    if (error.name === 'NoSuchBucket' || 
        error.Code === 'NoSuchBucket' ||
        error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Bucket not found',
          message: 'The specified S3 bucket does not exist',
        }),
      };
    }
    
    // Handle AWS throttling errors (429)
    if (error.name === 'ThrottlingException' || 
        error.Code === 'SlowDown' ||
        error.$metadata?.httpStatusCode === 429) {
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Retry-After': '60',
        },
        body: JSON.stringify({
          error: 'Too many requests',
          message: 'Request rate limit exceeded. Please try again later',
        }),
      };
    }
    
    // Generic server error (500) - don't expose internal details
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to generate signed URL. Please try again later',
      }),
    };
  }
};
