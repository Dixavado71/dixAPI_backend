import { Router } from 'express';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';
import * as controller from '../controllers/customerController.js';

const router = Router();
router.use(authenticate, ensureTenant());
router.get('/', authorize('admin', 'manager', 'operator'), controller.list);
router.post('/', authorize('admin', 'manager'), controller.create);
router.patch('/:id', authorize('admin', 'manager'), controller.update);
router.delete('/:id', authorize('admin', 'manager'), controller.remove);

export default router;