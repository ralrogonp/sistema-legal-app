import { S3Client } from '@aws-sdk/client-s3';
import { logger } from './logger.config';

const s3Config = {
  region: process.env.AWS_REGION || 'us-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
};

export const s3Client = new S3Client(s3Config);

export const S3_BUCKET = process.env.S3_BUCKET_NAME || 'sistema-legal-documentos';

// Validate S3 configuration
if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  logger.warn('⚠️  AWS credentials not configured. S3 functionality will be limited.');
}

logger.info(`📦 S3 configured: bucket=${S3_BUCKET}, region=${s3Config.region}`);

export default s3Client;
