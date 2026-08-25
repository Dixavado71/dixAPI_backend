import { Router } from 'express';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import * as controller from '../controllers/promotionController.js';

const router = Router();
router.use(authenticate, ensureTenant(), authorize('admin', 'manager'));
router.get('/', controller.listPromotions);
router.post('/', controller.createPromotion);
router.get('/coupons', controller.listCoupons);
router.post('/coupons', controller.createCoupon);
export default router;
