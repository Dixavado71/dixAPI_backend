import { Router } from 'express';
import * as usersController from '../controllers/usersController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';

const router = Router();

router.use(authenticate, ensureTenant());

router.get('/', authorize('admin', 'manager'), usersController.list);
router.get('/:id', authorize('admin', 'manager'), usersController.getById);
router.post('/', authorize('admin', 'manager'), usersController.create);
router.patch('/:id', authorize('admin', 'manager'), usersController.update);
router.delete('/:id', authorize('admin'), usersController.remove);

export default router;