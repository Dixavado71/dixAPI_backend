import { Router } from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';

const router = Router();

router.use(authenticate, ensureTenant());

router.get('/', notificationController.list);
router.patch('/:id/read', notificationController.markRead);
router.post('/read-all', notificationController.markAllRead);
router.get('/logs', notificationController.listLogs);

// Notification triggers (alert rules)
router.get('/triggers', authorize('admin', 'manager'), notificationController.listTriggers);
router.post('/triggers', authorize('admin', 'manager'), notificationController.createTrigger);
router.patch('/triggers/:id', authorize('admin', 'manager'), notificationController.updateTrigger);
router.delete('/triggers/:id', authorize('admin', 'manager'), notificationController.deleteTrigger);

export default router;