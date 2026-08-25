import { Router } from 'express';
import * as controller from '../controllers/deliveryController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { ensureTenant } from '../../../infrastructure/http/middlewares/tenant.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';

const router = Router();
router.use(authenticate, ensureTenant());
router.get('/settings', controller.settings);
router.patch('/settings', authorize('admin', 'manager'), controller.updateSettings);
router.get('/drivers', controller.drivers);
router.post('/drivers', authorize('admin', 'manager'), controller.createDriver);
router.get('/', controller.deliveries);
router.post('/', controller.createDelivery);
router.get('/:id', controller.showDelivery);
router.patch('/:id/status', authorize('admin', 'manager', 'operator'), controller.updateStatus);
router.post('/payments', authorize('admin', 'manager', 'operator'), controller.createPayment);
router.post('/payments/:id/confirm', authorize('admin', 'manager', 'operator'), controller.confirmPayment);

export default router;
