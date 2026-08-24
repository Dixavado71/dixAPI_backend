import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);

export default router;
