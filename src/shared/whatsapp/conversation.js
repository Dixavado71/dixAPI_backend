import * as conversationRepo from '../../modules/conversations/repositories/conversationRepository.js';

export async function syncConversation({ companyId, from, sender, content, messageType, sentAt = new Date() }) {
  const channel = 'whatsapp';
  let conversation = await conversationRepo.findConversationByContact(companyId, channel, from);

  if (!conversation) {
    conversation = await conversationRepo.createConversation({
      company_id: companyId,
      channel,
      contact_name: from,
      contact_phone: from,
      last_message: content || null,
      last_message_at: sentAt,
      unread_count: sender === 'customer' ? 1 : 0,
      status: sender === 'customer' ? 'open' : 'waiting',
    });
  } else {
    conversation = await conversationRepo.updateConversationLastMessage(conversation.id, content || null, sender === 'customer' ? 1 : 0);
    if (sender === 'customer') {
      conversation = await conversationRepo.updateConversation(conversation.id, { status: 'open' });
    }
  }

  await conversationRepo.createMessage({
    conversation_id: conversation.id,
    sender_type: sender,
    message_type: messageType === 'audio' ? 'audio' : messageType === 'image' ? 'image' : messageType === 'document' ? 'file' : 'text',
    content: content || '',
    status: 'delivered',
    sent_at: sentAt,
  });

  return conversation;
}

export default { syncConversation };