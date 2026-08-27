import { Router } from 'express';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import * as controller from '../controllers/orderController.js';

const router = Router();
router.use(authenticate, ensureTenant());
router.get('/', authorize('admin', 'manager', 'operator'), controller.list);
router.get('/:id', authorize('admin', 'manager', 'operator'), controller.get);
router.post('/', authorize('admin', 'manager', 'operator'), controller.create);
router.patch('/:id/status', authorize('admin', 'manager', 'operator'), controller.updateStatus);

export default router;