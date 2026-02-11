import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// Aquí puedes agregar rutas para versiones en el futuro
// router.get('/:caseId', getVersionsController);

export default router;
