import { Router } from 'express';
import { body } from 'express-validator';
import * as casesController from '../controllers/cases.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { UserRole } from '../types';

const router = Router();
router.use(authenticate);

router.get('/', casesController.getCases);
router.get('/:id', casesController.getCase);
router.get('/:id/versions', casesController.getCaseVersions);
router.post('/', validate([
  body('categoria').isIn(['CONTABLE', 'JURIDICO']),
  body('cliente').notEmpty(),
  body('descripcion').notEmpty()
]), casesController.createCase);
router.put('/:id', casesController.updateCase);
router.delete('/:id', authorize(UserRole.ADMIN), casesController.deleteCase);
router.post('/:id/versions', casesController.addVersion);
    router.post('/:id/comments', casesController.addComment);
    router.get('/:id/timeline', casesController.getCaseTimeline);
export default router;
