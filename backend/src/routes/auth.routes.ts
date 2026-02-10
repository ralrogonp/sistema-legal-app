import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { authRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

router.post('/register', authRateLimiter, validate([
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('nombre_completo').notEmpty()
]), authController.register);

router.post('/login', authRateLimiter, validate([
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
]), authController.login);

router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/password', authenticate, authController.changePassword);

export default router;
