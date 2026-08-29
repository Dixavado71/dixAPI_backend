import { Router } from 'express';
import * as companyController from '../controllers/companyController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';

const router = Router();

router.use(authenticate, ensureTenant(), authorize('admin', 'manager'));

router.get('/', companyController.index);
router.get('/:id', companyController.show);
router.post('/', authorize('admin'), companyController.store);
router.patch('/:id', companyController.update);
router.delete('/:id', companyController.destroy);

export default router;
