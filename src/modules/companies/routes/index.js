import { Router } from 'express';
import * as companyController from '../controllers/companyController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'manager'));

router.get('/', companyController.index);
router.get('/:id', companyController.show);
router.post('/', companyController.store);
router.patch('/:id', companyController.update);
router.delete('/:id', companyController.destroy);

export default router;
