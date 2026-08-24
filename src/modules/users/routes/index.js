import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';

const router = Router();

router.use(authenticate);

router.get('/', userController.index);
router.get('/:id', userController.show);
router.post('/', authorize('admin', 'manager'), userController.store);
router.patch('/:id', userController.update);
router.delete('/:id', authorize('admin', 'manager'), userController.destroy);

export default router;
