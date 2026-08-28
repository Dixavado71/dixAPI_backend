import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as whatsappController from '../controllers/whatsappController.js';
import { authenticate } from '../../../infrastructure/http/middlewares/authenticate.js';
import { authorize } from '../../../infrastructure/http/middlewares/authorize.js';
import ensureTenant from '../../../infrastructure/http/middlewares/tenant.js';
import { env } from '../../../config/env.js';

const router = Router();

// Public webhook — called by EvolutionAPI (no JWT). Instance name acts as the routing key.
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

function requireWebhookSecret(req, res, next) {
  if (!env.evolutionWebhookSecret) return next();
  const provided = req.headers['x-webhook-secret'];
  if (!provided || provided !== env.evolutionWebhookSecret) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Segredo do webhook inválido.' } });
  }
  return next();
}

router.post('/webhook/:instanceName', webhookLimiter, requireWebhookSecret, whatsappController.webhook);

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
router.post('/numbers/:id/contacts/profile-picture', authorize('admin', 'manager', 'operator'), whatsappController.getProfilePicture);
router.post('/numbers/:id/contacts/profile-name', authorize('admin', 'manager', 'operator'), whatsappController.getProfileName);
router.post('/numbers/:id/contacts/profile-status', authorize('admin', 'manager'), whatsappController.updateProfileStatus);

// Bot config & catalog
router.get('/numbers/:id/bot-config', authorize('admin', 'manager'), whatsappController.getBotConfig);
router.patch('/numbers/:id/bot-config', authorize('admin', 'manager'), whatsappController.updateBotConfig);
router.get('/numbers/:id/catalog', authorize('admin', 'manager', 'operator'), whatsappController.getCatalog);
router.get('/numbers/:id/notification-logs', authorize('admin', 'manager'), whatsappController.getNotificationLogs);
router.get('/numbers/:id/message-logs', authorize('admin', 'manager'), whatsappController.getMessageLogs);

// Linked groups (chatbot group forwarding)
router.get('/numbers/:id/linked-groups', authorize('admin', 'manager'), whatsappController.getLinkedGroups);
router.post('/numbers/:id/linked-groups', authorize('admin', 'manager'), whatsappController.createLinkedGroup);
router.post('/numbers/:id/linked-groups/sync', authorize('admin', 'manager'), whatsappController.syncLinkedGroups);
router.patch('/numbers/:id/linked-groups/:lgId', authorize('admin', 'manager'), whatsappController.updateLinkedGroup);
router.delete('/numbers/:id/linked-groups/:lgId', authorize('admin', 'manager'), whatsappController.removeLinkedGroup);

// Webhook management
router.get('/numbers/:id/webhook', authorize('admin', 'manager'), whatsappController.getWebhook);
router.post('/numbers/:id/webhook/setup', authorize('admin', 'manager'), whatsappController.setupWebhook);

// Messaging (basic)
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
router.post('/numbers/:id/send-status', authorize('admin', 'manager', 'operator'), whatsappController.sendStatus);
router.post('/numbers/:id/send-status-media', authorize('admin', 'manager', 'operator'), whatsappController.sendStatusMedia);

// Messaging (advanced)
router.post('/numbers/:id/send-poll', authorize('admin', 'manager', 'operator'), whatsappController.sendPoll);
router.post('/numbers/:id/send-contact', authorize('admin', 'manager', 'operator'), whatsappController.sendContact);
router.post('/numbers/:id/edit-message', authorize('admin', 'manager', 'operator'), whatsappController.editMessage);
router.post('/numbers/:id/delete-message', authorize('admin', 'manager', 'operator'), whatsappController.deleteMessage);

// Chat actions
router.post('/numbers/:id/read', authorize('admin', 'manager', 'operator'), whatsappController.markRead);
router.post('/numbers/:id/typing', authorize('admin', 'manager', 'operator'), whatsappController.typing);
router.post('/numbers/:id/presence', authorize('admin', 'manager'), whatsappController.presence);

// Chats
router.get('/numbers/:id/chats', authorize('admin', 'manager', 'operator'), whatsappController.getChats);
router.get('/numbers/:id/chats/messages', authorize('admin', 'manager', 'operator'), whatsappController.getChatMessages);
router.post('/numbers/:id/chats/find', authorize('admin', 'manager', 'operator'), whatsappController.findChat);
router.post('/numbers/:id/chats/check-number', authorize('admin', 'manager', 'operator'), whatsappController.checkNumber);
router.post('/numbers/:id/chats/:chatId/archive', authorize('admin', 'manager', 'operator'), whatsappController.archiveChat);
router.post('/numbers/:id/chats/:chatId/unarchive', authorize('admin', 'manager', 'operator'), whatsappController.unarchiveChat);
router.get('/numbers/:id/chats/:chatId/fetch-all', authorize('admin', 'manager', 'operator'), whatsappController.fetchAllMessages);

// Groups
router.post('/numbers/:id/groups', authorize('admin', 'manager'), whatsappController.createGroup);
router.get('/numbers/:id/groups', authorize('admin', 'manager', 'operator'), whatsappController.getGroups);
router.get('/numbers/:id/groups/:groupId', authorize('admin', 'manager', 'operator'), whatsappController.getGroup);
router.patch('/numbers/:id/groups/:groupId', authorize('admin', 'manager'), whatsappController.updateGroup);
router.post('/numbers/:id/groups/:groupId/settings', authorize('admin', 'manager'), whatsappController.groupSettings);
router.post('/numbers/:id/groups/:groupId/add', authorize('admin', 'manager'), whatsappController.addGroupParticipant);
router.post('/numbers/:id/groups/:groupId/remove', authorize('admin', 'manager'), whatsappController.removeGroupParticipant);
router.post('/numbers/:id/groups/:groupId/promote', authorize('admin', 'manager'), whatsappController.promoteGroupParticipant);
router.post('/numbers/:id/groups/:groupId/demote', authorize('admin', 'manager'), whatsappController.demoteGroupParticipant);
router.post('/numbers/:id/groups/:groupId/invite', authorize('admin', 'manager', 'operator'), whatsappController.getInviteLink);
router.post('/numbers/:id/groups/:groupId/revoke-invite', authorize('admin', 'manager'), whatsappController.revokeInviteLink);
router.post('/numbers/:id/groups/:groupId/picture', authorize('admin', 'manager'), whatsappController.updateGroupPicture);
router.post('/numbers/:id/groups/:groupId/leave', authorize('admin', 'manager'), whatsappController.leaveGroup);
router.post('/numbers/:id/groups/accept-invite', authorize('admin', 'manager'), whatsappController.acceptInviteCode);

// Status / Stories
router.get('/numbers/:id/stories', authorize('admin', 'manager', 'operator'), whatsappController.getStories);
router.get('/numbers/:id/stories/:statusId', authorize('admin', 'manager', 'operator'), whatsappController.getStoryById);
router.post('/numbers/:id/stories/reaction', authorize('admin', 'manager', 'operator'), whatsappController.reactStory);

// Capabilities EvolutionAPI (novos endpoints)
router.post('/numbers/:id/block', authorize('admin', 'manager'), whatsappController.blockContact);
router.post('/numbers/:id/pairing-code', authorize('admin', 'manager'), whatsappController.requestPairingCode);
router.get('/numbers/:id/groups/:groupId/participants', authorize('admin', 'manager', 'operator'), whatsappController.getGroupParticipants);
router.post('/numbers/:id/send-template', authorize('admin', 'manager', 'operator'), whatsappController.sendTemplate);
router.post('/numbers/:id/send-ptv', authorize('admin', 'manager', 'operator'), whatsappController.sendPtv);
router.post('/numbers/:id/groups/:groupId/ephemeral', authorize('admin', 'manager'), whatsappController.toggleEphemeral);
router.post('/numbers/:id/send-bulk', authorize('admin', 'manager'), whatsappController.sendBulk);
router.post('/numbers/:id/send-base64', authorize('admin', 'manager', 'operator'), whatsappController.sendBase64);
router.post('/numbers/:id/group-invite-info', authorize('admin', 'manager', 'operator'), whatsappController.getGroupInviteInfo);
router.post('/numbers/:id/groups/:groupId/send-invite', authorize('admin', 'manager'), whatsappController.sendGroupInvite);
router.post('/numbers/:id/contacts/find', authorize('admin', 'manager', 'operator'), whatsappController.findContacts);
router.delete('/numbers/:id/profile-picture', authorize('admin', 'manager'), whatsappController.removeProfilePicture);
router.post('/numbers/:id/business-profile', authorize('admin', 'manager', 'operator'), whatsappController.fetchBusinessProfile);
router.post('/numbers/:id/change-number', authorize('admin', 'manager'), whatsappController.changeNumber);
router.post('/numbers/:id/send-link-preview', authorize('admin', 'manager', 'operator'), whatsappController.sendLinkPreview);
router.post('/numbers/:id/typewriter', authorize('admin', 'manager', 'operator'), whatsappController.typewriter);

export default router;