import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';

const router = Router();

const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
const refreshRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
const registrationRateLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
const logoutRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });
const passwordResetRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });

router.post('/login', authRateLimit, authController.login);
router.post('/register-store', registrationRateLimit, authController.registerStore);
router.post('/register', registrationRateLimit, authenticate, authorize('master', 'admin', 'manager'), authController.register);
router.post('/refresh', refreshRateLimit, authController.refresh);
router.post('/logout', logoutRateLimit, authenticate, authController.logout);
router.post('/forgot-password', passwordResetRateLimit, authController.forgotPassword);
router.post('/reset-password', passwordResetRateLimit, authController.resetPassword);
router.post('/switch-company', authenticate, authController.switchCompany);
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
