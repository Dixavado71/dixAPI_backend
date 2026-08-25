import { Router } from 'express';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import * as controller from '../controllers/customizationController.js';

const router = Router();
router.use(authenticate, ensureTenant());
router.get('/', controller.get);
router.patch('/', authorize('admin', 'manager'), controller.update);
export default router;
