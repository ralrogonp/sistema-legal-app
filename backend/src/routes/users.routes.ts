import { Router } from 'express';
import { body } from 'express-validator';
import * as usersController from '../controllers/users.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { UserRole } from '../types';

const router = Router();
router.use(authenticate, authorize(UserRole.ADMIN));

router.get('/', usersController.getUsers);
router.post('/invite', validate([
  body('email').isEmail().normalizeEmail(),
  body('nombre_completo').notEmpty(),
  body('role').isIn(['ADMIN', 'CONTABLE', 'JURIDICO'])
]), usersController.inviteUser);
router.patch('/:id/toggle-status', usersController.toggleUserStatus);

export default router;
