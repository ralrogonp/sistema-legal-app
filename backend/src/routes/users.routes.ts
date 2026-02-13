import { Router } from 'express';
import * as usersController from '../controllers/users.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

router.get('/pending', usersController.getPendingUsers);
router.get('/', usersController.getAllUsers);
router.patch('/:id/approve', usersController.approveUser);
router.patch('/:id/role', usersController.changeUserRole);
router.patch('/:id/toggle-status', usersController.toggleUserStatus);

export default router;
