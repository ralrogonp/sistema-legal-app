import { Router } from 'express';
import * as statsController from '../controllers/stats.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/cases', statsController.getCasesStats);

export default router;
