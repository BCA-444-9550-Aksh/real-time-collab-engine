import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authRateLimiter } from '../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../validators/auth.validator';

const router = Router();

// Apply strict rate limiter to all auth routes
router.use(authRateLimiter);

router.post('/register', validate('body', registerSchema), authController.register);
router.post('/login',    validate('body', loginSchema),    authController.login);
router.post('/refresh',  validate('body', refreshTokenSchema), authController.refresh);
router.get('/me',        authenticate, authController.me);

export default router;
