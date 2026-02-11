import { Response } from 'express';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { s3Client, S3_BUCKET } from '../config/s3.config';
import { query } from '../config/database.config';
import { AuthRequest } from '../types';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { logger } from '../config/logger.config';

// @desc    Upload document to case
// @route   POST /api/documents
// @access  Private
export const uploadDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { caso_id } = req.body;
  const file = req.file;

  if (!file) {
    throw new AppError('No file provided', 400);
  }

  // Verificar que el caso existe
  const caseResult = await query('SELECT id FROM casos WHERE id = $1', [caso_id]);
  if (caseResult.rows.length === 0) {
    throw new AppError('Case not found', 404);
  }

  const fileKey = `casos/${caso_id}/${uuidv4()}-${file.originalname}`;

  const uploadParams = {
    Bucket: S3_BUCKET,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
    Metadata: {
      'uploaded-by': req.user!.id.toString(),
      'original-name': file.originalname
    }
  };

  await s3Client.send(new PutObjectCommand(uploadParams));

  const result = await query(
    `INSERT INTO documentos (caso_id, nombre_archivo, tipo_documento, tamano, s_3_key, s_3_url, subido_por, fecha_subida)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING *`,
    [
      caso_id,
      file.originalname,
      file.mimetype,
      file.size,
      fileKey,
      `s3://${S3_BUCKET}/${fileKey}`,
      req.user!.id
    ]
  );

  logger.info(`Document uploaded: ${file.originalname} for case ${caso_id} by user ${req.user!.id}`);

  res.status(201).json({
    success: true,
    data: result.rows[0],
    message: 'Document uploaded successfully'
  });
});

// @desc    Get documents for a case
// @route   GET /api/documents?caso_id=:id
// @access  Private
export const getDocuments = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { caso_id } = req.query;

  if (!caso_id) {
    throw new AppError('caso_id is required', 400);
  }

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

// @desc    Get signed URL for document download
// @route   GET /api/documents/:id/download
// @access  Private
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
    data: { url: signedUrl, filename: doc.nombre_archivo }
  });
});

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private (Admin or owner)
export const deleteDocument = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query('SELECT * FROM documentos WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    throw new AppError('Document not found', 404);
  }

  const doc = result.rows[0];

  // Solo ADMIN puede eliminar
  if (req.user!.role !== 'ADMIN') {
    throw new AppError('Only admin can delete documents', 403);
  }

  // Eliminar de S3
  await s3Client.send(new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: doc.s_3_key
  }));

  // Eliminar de BD
  await query('DELETE FROM documentos WHERE id = $1', [id]);

  logger.info(`Document deleted: ${doc.nombre_archivo} by user ${req.user!.id}`);

  res.json({
    success: true,
    message: 'Document deleted successfully'
  });
});

// ====================
// S3 Management
// ====================

// @desc    Get S3 folders
// @route   GET /api/s3/folders
// @access  Private
export const getS3Folders = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await query(
    `SELECT * FROM s3_carpetas ORDER BY ruta_completa`,
    []
  );

  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Create S3 folder
// @route   POST /api/s3/folders
// @access  Private (Admin only)
export const createS3Folder = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { nombre, carpeta_padre_id } = req.body;

  if (!nombre) {
    throw new AppError('Folder name is required', 400);
  }

  let ruta_completa = `/${nombre}`;
  
  if (carpeta_padre_id) {
    const parentResult = await query(
      'SELECT ruta_completa FROM s3_carpetas WHERE id = $1',
      [carpeta_padre_id]
    );
    
    if (parentResult.rows.length > 0) {
      ruta_completa = `${parentResult.rows[0].ruta_completa}/${nombre}`;
    }
  }

  const result = await query(
    `INSERT INTO s3_carpetas (nombre, ruta_completa, carpeta_padre_id, creado_por, fecha_creacion)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [nombre, ruta_completa, carpeta_padre_id, req.user!.id]
  );

  logger.info(`S3 folder created: ${ruta_completa} by user ${req.user!.id}`);

  res.status(201).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Get S3 files
// @route   GET /api/s3/files?folderId=:id
// @access  Private
export const getS3Files = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { folderId } = req.query;

  let queryText = `
    SELECT f.*, u.nombre_completo as subido_por_nombre, c.nombre as carpeta_nombre
    FROM s3_archivos f
    LEFT JOIN users u ON f.subido_por = u.id
    LEFT JOIN s3_carpetas c ON f.carpeta_id = c.id
  `;

  const params: any[] = [];

  if (folderId) {
    queryText += ' WHERE f.carpeta_id = $1';
    params.push(folderId);
  }

  queryText += ' ORDER BY f.fecha_subida DESC';

  const result = await query(queryText, params);

  res.json({
    success: true,
    data: result.rows
  });
});

// @desc    Upload file to S3 folder
// @route   POST /api/s3/files
// @access  Private
export const uploadS3File = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { carpeta_id } = req.body;
  const file = req.file;

  if (!file) {
    throw new AppError('No file provided', 400);
  }

  let folder_path = '';
  if (carpeta_id) {
    const folderResult = await query(
      'SELECT ruta_completa FROM s3_carpetas WHERE id = $1',
      [carpeta_id]
    );
    if (folderResult.rows.length > 0) {
      folder_path = folderResult.rows[0].ruta_completa;
    }
  }

  const fileKey = `${folder_path}/${uuidv4()}-${file.originalname}`;

  const uploadParams = {
    Bucket: S3_BUCKET,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype
  };

  await s3Client.send(new PutObjectCommand(uploadParams));

  const result = await query(
    `INSERT INTO s3_archivos (carpeta_id, nombre_archivo, s3_key, s3_url, tipo_archivo, tamano_bytes, subido_por, fecha_subida, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
     RETURNING *`,
    [
      carpeta_id || null,
      file.originalname,
      fileKey,
      `s3://${S3_BUCKET}/${fileKey}`,
      file.mimetype,
      file.size,
      req.user!.id,
      JSON.stringify({ originalname: file.originalname })
    ]
  );

  logger.info(`S3 file uploaded: ${file.originalname} by user ${req.user!.id}`);

  res.status(201).json({
    success: true,
    data: result.rows[0]
  });
});

// @desc    Delete S3 file
// @route   DELETE /api/s3/files/:id
// @access  Private (Admin only)
export const deleteS3File = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query('SELECT * FROM s3_archivos WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    throw new AppError('File not found', 404);
  }

  const file = result.rows[0];

  await s3Client.send(new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: file.s3_key
  }));

  await query('DELETE FROM s3_archivos WHERE id = $1', [id]);

  logger.info(`S3 file deleted: ${file.nombre_archivo} by user ${req.user!.id}`);

  res.json({
    success: true,
    message: 'File deleted successfully'
  });
});

// @desc    Download S3 file
// @route   GET /api/s3/files/:id/download
// @access  Private
export const downloadS3File = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const result = await query('SELECT * FROM s3_archivos WHERE id = $1', [id]);

  if (result.rows.length === 0) {
    throw new AppError('File not found', 404);
  }

  const file = result.rows[0];

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: file.s3_key
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  res.json({
    success: true,
    data: { url: signedUrl, filename: file.nombre_archivo }
  });
});

export default {
  uploadDocument,
  getDocuments,
  getDocumentUrl,
  deleteDocument,
  getS3Folders,
  createS3Folder,
  getS3Files,
  uploadS3File,
  deleteS3File,
  downloadS3File
};
