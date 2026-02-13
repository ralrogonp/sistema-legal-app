import { Response } from 'express';
import { query } from '../config/database.config';
import { AuthRequest } from '../types';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { CreateBucketCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../config/s3.config';
import { logger } from '../config/logger.config';

// @desc    List S3 buckets
// @route   GET /api/buckets
// @access  Admin only
export const listBuckets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const command = new ListBucketsCommand({});
  const awsBuckets = await s3Client.send(command);

  const dbBuckets = await query(
    `SELECT * FROM s3_buckets WHERE activo = true ORDER BY fecha_creacion DESC`
  );

  res.json({
    success: true,
    data: {
      aws_buckets: awsBuckets.Buckets || [],
      registered_buckets: dbBuckets.rows
    }
  });
});

// @desc    Create new bucket
// @route   POST /api/buckets
// @access  Admin only
export const createBucket = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { nombre, region, descripcion } = req.body;

  const command = new CreateBucketCommand({
    Bucket: nombre,
    CreateBucketConfiguration: region !== 'us-east-1' ? {
      LocationConstraint: region
    } : undefined
  });

  await s3Client.send(command);

  const result = await query(
    `INSERT INTO s3_buckets (nombre, region, creado_por, descripcion, activo)
     VALUES ($1, $2, $3, $4, true)
     RETURNING *`,
    [nombre, region || 'us-east-1', req.user!.id, descripcion || null]
  );

  logger.info(`Bucket created: ${nombre} by user ${req.user!.id}`);

  res.status(201).json({
    success: true,
    data: result.rows[0],
    message: 'Bucket created successfully'
  });
});

export default {
  listBuckets,
  createBucket
};
