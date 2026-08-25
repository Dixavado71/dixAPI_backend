import { Router } from 'express';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import * as controller from '../controllers/catalogController.js';

const router = Router();
router.get('/categories', controller.categories);
router.get('/services', controller.services);
router.use(authenticate, ensureTenant());
router.get('/company/categories', controller.companyCategories);
router.get('/company/services', controller.companyServices);
router.post('/company/categories', authorize('admin', 'manager'), controller.addCategory);
router.post('/company/services', authorize('admin', 'manager'), controller.addService);

export default router;
