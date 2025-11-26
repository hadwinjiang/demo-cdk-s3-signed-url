import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { Tags } from 'aws-cdk-lib';

export interface ServerlessS3SignerStackProps extends cdk.StackProps {  
  /**
   * URL expiration time in seconds.
   * @default 3600
   */
  signedUrlExpiration?: number;
  
  /**
   * AWS Access Key ID for AKSK authentication.
   * Required for multi-bucket access.
   */
  ownerAccessKey: string;
  
  /**
   * AWS Secret Access Key for AKSK authentication.
   * Required for multi-bucket access.
   */
  ownerSecretKey: string;
}

export class ServerlessS3SignerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: ServerlessS3SignerStackProps) {
    super(scope, id, props);

    const signedUrlExpiration = props?.signedUrlExpiration ?? 3600;

    // Validate required AKSK credentials
    if (!props?.ownerAccessKey || !props?.ownerSecretKey) {
      throw new Error('ownerAccessKey and ownerSecretKey are required in stack props');
    }

    // Build environment variables
    const environment: { [key: string]: string } = {
      SIGNED_URL_EXPIRATION: signedUrlExpiration.toString(),
      Owner_Access_Key: props.ownerAccessKey,
      Owner_Secret_KEY: props.ownerSecretKey,
    };

    // Create Lambda function
    const signUrlFunction = new lambda.Function(this, 'SignUrlFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment,
      timeout: cdk.Duration.seconds(180),
    });

    // Add tag to Lambda function
    Tags.of(signUrlFunction).add('project', 'chervon');

    // Note: S3 IAM policies removed - Lambda will use AKSK credentials from environment variables
    // The Owner_Access_Key and Owner_Secret_KEY provide direct AWS authentication


    // Create API Gateway
    const api = new apigateway.RestApi(this, 'SignUrlApi', {
      restApiName: 'S3 Signed URL Service',
      description: 'API for generating S3 signed URLs',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Add tag to API Gateway
    Tags.of(api).add('project', 'chervon');

    // Add Lambda integration
    const lambdaIntegration = new apigateway.LambdaIntegration(signUrlFunction);
    api.root.addMethod('POST', lambdaIntegration);

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: signUrlFunction.functionName,
      description: 'Lambda Function Name',
    });
  }
}
