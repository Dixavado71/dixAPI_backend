import { Router } from 'express';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';
import * as controller from '../controllers/couponController.js';

const router = Router();
router.use(authenticate, ensureTenant());
router.post('/validate', controller.validate);
router.post('/redeem', controller.redeem);

export default router;
