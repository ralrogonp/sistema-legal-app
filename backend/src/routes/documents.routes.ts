import { Router } from 'express';
import multer from 'multer';
import * as documentsController from '../controllers/documents.controller';
import { authenticate } from '../middleware/auth.middleware';
import { uploadRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.use(authenticate);
router.post('/', uploadRateLimiter, upload.single('file'), documentsController.uploadDocument);
router.get('/', documentsController.getDocuments);
router.get('/:id/url', documentsController.getDocumentUrl);
router.delete('/:id', documentsController.deleteDocument);

export default router;
