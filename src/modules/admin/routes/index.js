import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';

const router = Router();

router.use(authenticate);

// Platform admin (master)
router.get('/overview', authorize('master'), adminController.overview);
router.get('/stores', authorize('master'), adminController.stores);
router.get('/payments', authorize('master'), adminController.payments);
router.get('/plans', authorize('master'), adminController.plans);
router.get('/users', authorize('master'), adminController.users);
router.post('/stores', authorize('master', 'reseller'), adminController.createStore);

// Reseller
router.get('/reseller/overview', authorize('reseller'), adminController.resellerOverview);
router.get('/reseller/stores', authorize('reseller'), adminController.resellerStores);
router.get('/reseller/commissions', authorize('reseller'), adminController.resellerCommissions);
router.get('/reseller/payments', authorize('reseller'), adminController.resellerPayments);
router.post('/reseller/stores', authorize('reseller'), adminController.resellerCreateStore);

export default router;
