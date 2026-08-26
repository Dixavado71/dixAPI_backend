import { Router } from 'express';
import * as transactionController from '../controllers/transactionController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';

const router = Router();
router.use(authenticate, ensureTenant());

router.get('/', authorize('admin', 'manager'), transactionController.list);
router.post('/', authorize('admin', 'manager'), transactionController.create);

export default router;