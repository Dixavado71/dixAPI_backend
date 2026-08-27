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
router.post('/numbers/:id/contacts/profile-picture', authorize('admin', 'manager', 'operator'), whatsappController.getProfilePicture);
router.post('/numbers/:id/contacts/profile-name', authorize('admin', 'manager', 'operator'), whatsappController.getProfileName);
router.post('/numbers/:id/contacts/profile-status', authorize('admin', 'manager'), whatsappController.updateProfileStatus);

// Bot config & catalog
router.get('/numbers/:id/bot-config', authorize('admin', 'manager'), whatsappController.getBotConfig);
router.patch('/numbers/:id/bot-config', authorize('admin', 'manager'), whatsappController.updateBotConfig);
router.get('/numbers/:id/catalog', authorize('admin', 'manager', 'operator'), whatsappController.getCatalog);

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
router.get('/numbers/:id/status', authorize('admin', 'manager', 'operator'), whatsappController.getStories);
router.get('/numbers/:id/status/:statusId', authorize('admin', 'manager', 'operator'), whatsappController.getStoryById);
router.post('/numbers/:id/status/reaction', authorize('admin', 'manager', 'operator'), whatsappController.reactStory);

export default router;