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

// Number lifecycle
router.get('/numbers', authorize('admin', 'manager'), whatsappController.listNumbers);
router.post('/numbers/connect', authorize('admin', 'manager'), whatsappController.connectNumber);
router.get('/numbers/:id/qrcode', authorize('admin', 'manager'), whatsappController.getQrCode);
router.get('/numbers/:id/status', authorize('admin', 'manager'), whatsappController.getStatus);
router.post('/numbers/:id/restart', authorize('admin', 'manager'), whatsappController.restartNumber);
router.post('/numbers/:id/logout', authorize('admin', 'manager'), whatsappController.logoutNumber);
router.post('/numbers/:id/disconnect', authorize('admin', 'manager'), whatsappController.disconnectNumber);
router.delete('/numbers/:id', authorize('admin', 'manager'), whatsappController.deleteNumber);

// Profile
router.patch('/numbers/:id/profile', authorize('admin', 'manager'), whatsappController.updateProfile);
router.patch('/numbers/:id/picture', authorize('admin', 'manager'), whatsappController.updatePicture);

// Webhook management
router.get('/numbers/:id/webhook', authorize('admin', 'manager'), whatsappController.getWebhook);
router.post('/numbers/:id/webhook/setup', authorize('admin', 'manager'), whatsappController.setupWebhook);

// Messaging
router.post('/numbers/:id/send', authorize('admin', 'manager', 'operator'), whatsappController.sendMessage);
router.post('/numbers/:id/send-media', authorize('admin', 'manager', 'operator'), whatsappController.sendMedia);
router.post('/numbers/:id/send-audio', authorize('admin', 'manager', 'operator'), whatsappController.sendAudio);
router.post('/numbers/:id/send-document', authorize('admin', 'manager', 'operator'), whatsappController.sendDocument);
router.post('/numbers/:id/send-video', authorize('admin', 'manager', 'operator'), whatsappController.sendVideo);
router.post('/numbers/:id/send-sticker', authorize('admin', 'manager', 'operator'), whatsappController.sendSticker);
router.post('/numbers/:id/send-buttons', authorize('admin', 'manager', 'operator'), whatsappController.sendButtons);
router.post('/numbers/:id/send-list', authorize('admin', 'manager', 'operator'), whatsappController.sendList);
router.post('/numbers/:id/send-location', authorize('admin', 'manager', 'operator'), whatsappController.sendLocation);
router.post('/numbers/:id/send-reaction', authorize('admin', 'manager', 'operator'), whatsappController.sendReaction);

// Chat actions
router.post('/numbers/:id/read', authorize('admin', 'manager', 'operator'), whatsappController.markRead);
router.post('/numbers/:id/typing', authorize('admin', 'manager', 'operator'), whatsappController.typing);
router.post('/numbers/:id/presence', authorize('admin', 'manager'), whatsappController.presence);

// Chats & contacts
router.get('/numbers/:id/chats', authorize('admin', 'manager', 'operator'), whatsappController.getChats);
router.get('/numbers/:id/chats/messages', authorize('admin', 'manager', 'operator'), whatsappController.getChatMessages);

export default router;