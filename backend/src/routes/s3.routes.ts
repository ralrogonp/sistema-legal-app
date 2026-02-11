import { Router } from 'express';
import multer from 'multer';
import * as documentsController from '../controllers/documents.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadRateLimiter } from '../middleware/rateLimiter.middleware';
import { UserRole } from '../types';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

router.use(authenticate);

// ====================
// Carpetas
// ====================

// Listar carpetas
router.get('/folders', documentsController.getS3Folders);

// Crear carpeta (solo ADMIN)
router.post(
  '/folders',
  authorize(UserRole.ADMIN),
  documentsController.createS3Folder
);

// ====================
// Archivos
// ====================

// Listar archivos
router.get('/files', documentsController.getS3Files);

// Subir archivo
router.post(
  '/files',
  uploadRateLimiter,
  upload.single('file'),
  documentsController.uploadS3File
);

// Descargar archivo
router.get('/files/:id/download', documentsController.downloadS3File);

// Eliminar archivo (solo ADMIN)
router.delete(
  '/files/:id',
  authorize(UserRole.ADMIN),
  documentsController.deleteS3File
);

export default router;
