import { Router } from 'express';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import { env } from '../../../config/env.js';
import { requireWebhookSecret } from '../../../shared/http/webhookSecret.js';
import * as controller from '../controllers/paymentEventController.js';

const router = Router();

router.use(authenticate, ensureTenant(), authorize('admin', 'manager'));
router.post('/events', requireWebhookSecret(env.paymentWebhookSecret, 'Segredo do webhook de pagamento inválido.'), controller.process);

export default router;
