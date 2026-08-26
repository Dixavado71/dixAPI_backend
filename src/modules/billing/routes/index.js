import { Router } from 'express';
import * as billingController from '../controllers/billingController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';

const router = Router();

router.use(authenticate, ensureTenant(), authorize('admin', 'manager'));

router.get('/', billingController.index);
router.post('/subscriptions', billingController.subscribe);
router.post('/payments/confirm', billingController.confirmPayment);

export default router;
