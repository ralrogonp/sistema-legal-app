import { Response } from 'express';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { s3Client, S3_BUCKET } from '../config/s3.config';
import { query } from '../config/database.config';
import { AuthRequest } from '../types';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { logger } from '../config/logger.config';

export const uploadDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { caso_id } = req.body;
  const file = req.file;

  if (!file) {
    throw new AppError('No file provided', 400);
  }

  const fileKey = `casos/${caso_id}/${uuidv4()}-${file.originalname}`;

  const uploadParams = {
    Bucket: S3_BUCKET,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype
  };

  await s3Client.send(new PutObjectCommand(uploadParams));

  const result = await query(
    `INSERT INTO documentos (caso_id, nombre_archivo, tipo_documento, tamano, s_3_key, s_3_url, subido_por, fecha_subida)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING *`,
    [caso_id, file.originalname, file.mimetype, file.size, fileKey, `s3://${S3_BUCKET}/${fileKey}`, req.user!.id]
  );

  logger.info(`Document uploaded: ${file.originalname} for case ${caso_id}`);

  res.status(201).json({
    success: true,
    data: result.rows[0],
    message: 'Document uploaded successfully'
  });
});

export const getDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { caso_id } = req.query;

  const result = await query(
    `SELECT d.*, u.nombre_completo as subido_por_nombre
     FROM documentos d
     LEFT JOIN users u ON d.subido_por = u.id
     WHERE d.caso_id = $1
     ORDER BY d.fecha_subida DESC`,
    [caso_id]
  );

  res.json({
    success: true,
    data: result.rows
  });
});

export const getDocumentUrl = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query('SELECT * FROM documentos WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    throw new AppError('Document not found', 404);
  }

  const doc = result.rows[0];
  
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: doc.s_3_key
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  res.json({
    success: true,
    data: { url: signedUrl }
  });
});

export const deleteDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query('SELECT * FROM documentos WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    throw new AppError('Document not found', 404);
  }

  const doc = result.rows[0];

  await s3Client.send(new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: doc.s_3_key
  }));

  await query('DELETE FROM documentos WHERE id = $1', [id]);

  logger.info(`Document deleted: ${doc.nombre_archivo}`);

  res.json({
    success: true,
    message: 'Document deleted successfully'
  });
});

export default { uploadDocument, getDocuments, getDocumentUrl, deleteDocument };
