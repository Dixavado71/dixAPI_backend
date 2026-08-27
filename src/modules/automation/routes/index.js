import { Router } from 'express';
import * as automationController from '../controllers/automationController.js';
import * as quickReplyController from '../controllers/quickReplyController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';

const router = Router();

router.use(authenticate, ensureTenant());

router.get('/flows', authorize('admin', 'manager'), automationController.list);
router.post('/flows', authorize('admin', 'manager'), automationController.create);
router.get('/flows/:id', authorize('admin', 'manager', 'operator'), automationController.getById);
router.put('/flows/:id', authorize('admin', 'manager'), automationController.update);
router.delete('/flows/:id', authorize('admin', 'manager'), automationController.remove);
router.patch('/flows/:id/toggle', authorize('admin', 'manager'), automationController.toggle);
router.post('/flows/:id/duplicate', authorize('admin', 'manager'), automationController.duplicate);
router.post('/flows/:id/test', authorize('admin', 'manager'), automationController.test);

router.get('/quick-replies', authorize('admin', 'manager', 'operator'), quickReplyController.list);
router.post('/quick-replies', authorize('admin', 'manager'), quickReplyController.create);
router.put('/quick-replies/:id', authorize('admin', 'manager'), quickReplyController.update);
router.delete('/quick-replies/:id', authorize('admin', 'manager'), quickReplyController.remove);
router.post('/quick-replies/:id/use', authorize('admin', 'manager', 'operator'), quickReplyController.incrementUsage);

export default router;