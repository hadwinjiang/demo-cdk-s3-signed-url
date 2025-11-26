# Serverless S3 Signed URL Generator

AWS CDK project that deploys a serverless application to generate pre-signed URLs for S3 objects across multiple buckets.

## Architecture

- **API Gateway**: REST API frontend
- **Lambda**: Node.js function to generate signed URLs with multi-bucket support

## Features

- Generate signed URLs for objects in any S3 bucket (with appropriate IAM permissions)
- Flexible request format supporting S3 URI paths (`s3://bucket/key`)
- Configurable URL expiration time
- Comprehensive error handling and validation

## Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with credentials
- AWS CDK CLI: `npm install -g aws-cdk`

## Setup

1. Install dependencies:
```bash
npm install
cd lambda && npm install && cd ..
```

2. Bootstrap CDK (first time only):
```bash
cdk bootstrap
```

3. **Configure AKSK Credentials** (Required):

The Lambda function uses AWS Access Key and Secret Key (AKSK) credentials for authentication. You must configure these credentials as environment variables in the CDK stack.

⚠️ **Security Warning**: Never commit credentials directly in code. Always use Secrets Manager or Parameter Store for production deployments.

**Creating IAM User for AKSK Credentials**

Create a dedicated IAM user with minimal permissions:

```bash
# Create IAM user
aws iam create-user --user-name s3-url-signer

# Attach policy for S3 read access
aws iam attach-user-policy \
  --user-name s3-url-signer \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# Create access key
aws iam create-access-key --user-name s3-url-signer
```

For more restrictive access, create a custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],
      "Resource": "arn:aws:s3:::my-allowed-buckets-*/*"
    }
  ]
}
```

4. Deploy the stack:
```bash
npm run deploy
```

The deployment will output your API Gateway URL.

## Usage

### Request Format

Send a POST request to the API Gateway URL with an S3 path:

**Primary Format (S3 URI):**
```bash
curl -X POST https://YOUR-API-URL/ \
  -H "Content-Type: application/json" \
  -d '{"s3Path": "s3://my-bucket/path/to/file.txt"}'
```

### Response Format

**Success Response (200):**
```json
{
  "signedUrl": "https://my-bucket.s3.amazonaws.com/path/to/file.txt?X-Amz-Algorithm=...",
  "bucket": "my-bucket",
  "key": "path/to/file.txt",
  "expiresIn": 3600
}
```

**Error Response (400 - Invalid Request):**
```json
{
  "error": "Invalid S3 path format",
  "message": "S3 path must follow the format: s3://bucket-name/path/to/object"
}
```

**Error Response (403 - Access Denied):**
```json
{
  "error": "Access denied",
  "message": "Insufficient permissions to access bucket: my-bucket"
}
```

### Example Use Cases

**Generate URL for a document:**
```bash
curl -X POST https://YOUR-API-URL/ \
  -H "Content-Type: application/json" \
  -d '{"s3Path": "s3://company-docs/reports/2024/annual-report.pdf"}'
```

**Generate URL for an image:**
```bash
curl -X POST https://YOUR-API-URL/ \
  -H "Content-Type: application/json" \
  -d '{"s3Path": "s3://media-assets/images/logo.png"}'
```

**Generate URL with nested paths:**
```bash
curl -X POST https://YOUR-API-URL/ \
  -H "Content-Type: application/json" \
  -d '{"s3Path": "s3://data-lake/raw/2024/11/26/events.json"}'
```

### Running Tests

```bash
cd lambda
npm test
```

## Clean Up

Remove all deployed resources:

```bash
cdk destroy
```

This will delete:
- API Gateway
- Lambda function
- IAM roles and policies

## License

MIT
