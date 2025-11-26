#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ServerlessS3SignerStack } from '../lib/stack';

const app = new cdk.App();

// Retrieve AKSK credentials from environment variables
const ownerAccessKey = process.env.OWNER_ACCESS_KEY;
const ownerSecretKey = process.env.OWNER_SECRET_KEY;

if (!ownerAccessKey || !ownerSecretKey) {
  throw new Error(
    'OWNER_ACCESS_KEY and OWNER_SECRET_KEY environment variables must be set for CDK deployment.\n' +
    'These credentials will be used by the Lambda function for S3 access.'
  );
}

new ServerlessS3SignerStack(app, 'ServerlessS3SignerStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  ownerAccessKey,
  ownerSecretKey,
});
