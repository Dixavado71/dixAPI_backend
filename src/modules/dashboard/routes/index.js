import { Router } from 'express';
import * as dashboardController from '../controllers/dashboardController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';

const router = Router();

router.use(authenticate, ensureTenant());

router.get('/overview', authorize('admin', 'manager', 'operator'), dashboardController.overview);

export default router;