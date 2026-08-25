import { Router } from 'express';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import * as controller from '../controllers/consentController.js';

const router = Router();
router.use(authenticate, ensureTenant());
router.post('/', authorize('admin', 'manager'), controller.create);
router.get('/customer/:customerId', authorize('admin', 'manager'), controller.list);
export default router;
