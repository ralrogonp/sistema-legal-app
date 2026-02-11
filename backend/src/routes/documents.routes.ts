import { Router } from 'express';
import multer from 'multer';
import * as documentsController from '../controllers/documents.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadRateLimiter } from '../middleware/rateLimiter.middleware';
import { UserRole } from '../types';

const router = Router();

// Configurar multer para subida de archivos en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

// ====================
// Rutas de Documentos de Casos
// ====================

router.use(authenticate);

// Upload documento a caso
router.post(
  '/',
  uploadRateLimiter,
  upload.single('file'),
  documentsController.uploadDocument
);

// Obtener documentos de un caso
router.get('/', documentsController.getDocuments);

// Obtener URL firmada para descargar
router.get('/:id/download', documentsController.getDocumentUrl);

// Eliminar documento
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  documentsController.deleteDocument
);

export default router;
