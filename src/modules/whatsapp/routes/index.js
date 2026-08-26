import { Router } from 'express';
import * as whatsappController from '../controllers/whatsappController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';

const router = Router();

// Public webhook — called by EvolutionAPI (no JWT). Instance name acts as the routing key.
router.post('/webhook/:instanceName', whatsappController.webhook);

// Authenticated routes
router.use(authenticate, ensureTenant());

router.get('/numbers', authorize('admin', 'manager'), whatsappController.listNumbers);
router.post('/numbers/connect', authorize('admin', 'manager'), whatsappController.connectNumber);
router.get('/numbers/:id/qrcode', authorize('admin', 'manager'), whatsappController.getQrCode);
router.get('/numbers/:id/status', authorize('admin', 'manager'), whatsappController.getStatus);
router.post('/numbers/:id/disconnect', authorize('admin', 'manager'), whatsappController.disconnectNumber);
router.delete('/numbers/:id', authorize('admin', 'manager'), whatsappController.deleteNumber);
router.post('/numbers/:id/send', authorize('admin', 'manager', 'operator'), whatsappController.sendMessage);
router.post('/numbers/:id/send-media', authorize('admin', 'manager'), whatsappController.sendMedia);

export default router;