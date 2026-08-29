import { describe, it, expect, vi, beforeEach } from 'vitest';

const conversationRepo = {
  listConversations: vi.fn(),
  findConversationById: vi.fn(),
  listMessages: vi.fn(),
  markConversationRead: vi.fn(),
  markMessagesRead: vi.fn(),
  updateConversation: vi.fn(),
  createMessage: vi.fn(),
  updateConversationLastMessage: vi.fn(),
};
vi.mock('../src/modules/conversations/repositories/conversationRepository.js', () => conversationRepo);
vi.mock('../src/modules/whatsapp/repositories/whatsappRepository.js', () => ({ listNumbers: vi.fn().mockResolvedValue([]) }));
vi.mock('../src/infrastructure/whatsapp/evolutionApiClient.js', () => ({ sendText: vi.fn() }));
vi.mock('../src/shared/whatsapp/customer.js', () => ({ handleCustomerCommand: vi.fn().mockResolvedValue(null) }));

const service = await import('../src/modules/conversations/services/conversationService.js');

const rawConversation = {
  id: 'cv1',
  company_id: 'c1',
  customer_id: 'cust1',
  channel: 'whatsapp',
  contact_name: 'Maria',
  contact_phone: '5511999999999',
  last_message: 'Olá',
  last_message_at: '2026-01-01T00:00:00.000Z',
  unread_count: 2,
  is_pinned: false,
  is_archived: false,
  assigned_to: null,
  status: 'open',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('conversationService DTO (camelCase)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps getById to camelCase', async () => {
    conversationRepo.findConversationById.mockResolvedValue(rawConversation);
    const result = await service.getById('c1', 'cv1');
    expect(result).toMatchObject({
      companyId: 'c1',
      customerId: 'cust1',
      contactName: 'Maria',
      contactPhone: '5511999999999',
      lastMessage: 'Olá',
      lastMessageAt: '2026-01-01T00:00:00.000Z',
      unreadCount: 2,
      isPinned: false,
      isArchived: false,
      assignedTo: null,
    });
    expect(result.contact_name).toBeUndefined();
    expect(result.last_message).toBeUndefined();
  });

  it('maps list to camelCase summary', async () => {
    conversationRepo.listConversations.mockResolvedValue([{ ...rawConversation, messages: [{ sender_type: 'customer' }] }]);
    const result = await service.list('c1', {});
    expect(result[0]).toMatchObject({ customer: 'Maria', lastMessage: 'Olá', unread: 2, pinned: false, assigned: null });
  });
});