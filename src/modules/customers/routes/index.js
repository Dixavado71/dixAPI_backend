import { Router } from 'express';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';
import * as controller from '../controllers/customerController.js';

const router = Router();
router.use(authenticate, ensureTenant());
router.get('/', controller.list);
router.post('/', controller.create);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);

export default router;