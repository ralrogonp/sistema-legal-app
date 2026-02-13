import { Router } from 'express';
import * as bucketsController from '../controllers/buckets.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

router.get('/', bucketsController.listBuckets);
router.post('/', bucketsController.createBucket);

export default router;
