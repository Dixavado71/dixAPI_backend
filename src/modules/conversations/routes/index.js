import { Router } from 'express';
import * as conversationController from '../controllers/conversationController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';

const router = Router();

router.use(authenticate, ensureTenant());

router.get('/', authorize('admin', 'manager', 'operator'), conversationController.list);
router.get('/:id', authorize('admin', 'manager', 'operator'), conversationController.getById);
router.get('/:id/messages', authorize('admin', 'manager', 'operator'), conversationController.listMessages);
router.patch('/:id/status', authorize('admin', 'manager'), conversationController.updateStatus);
router.post('/:id/assign', authorize('admin', 'manager'), conversationController.assign);
router.post('/:id/send', authorize('admin', 'manager', 'operator'), conversationController.sendReply);

export default router;