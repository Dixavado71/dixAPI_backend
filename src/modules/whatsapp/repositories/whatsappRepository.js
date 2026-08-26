import prisma from '../../../infrastructure/database/prismaClient.js';

export function findNumberById(companyId, id) {
  return prisma.whatsAppNumber.findFirst({ where: { id, company_id: companyId } });
}

export function findNumberByPhone(companyId, phoneNumber) {
  return prisma.whatsAppNumber.findFirst({ where: { company_id: companyId, phone_number: phoneNumber } });
}

export function findNumberByExternalAccountId(instanceName) {
  return prisma.whatsAppNumber.findFirst({ where: { external_account_id: instanceName } });
}

export function listNumbers(companyId) {
  return prisma.whatsAppNumber.findMany({
    where: { company_id: companyId },
    include: { _count: { select: { messages: true, contacts: true } } },
    orderBy: { created_at: 'desc' },
  });
}

export function upsertNumber(companyId, data) {
  return prisma.whatsAppNumber.upsert({
    where: { company_id_phone_number: { company_id: companyId, phone_number: data.phoneNumber } },
    create: {
      company_id: companyId,
      phone_number: data.phoneNumber,
      display_name: data.displayName ?? null,
      external_account_id: data.externalAccountId ?? null,
      status: data.status ?? 'pending',
      is_bot_enabled: data.isBotEnabled ?? true,
    },
    update: {
      display_name: data.displayName ?? undefined,
      external_account_id: data.externalAccountId ?? undefined,
      status: data.status ?? undefined,
      is_bot_enabled: data.isBotEnabled ?? undefined,
      last_connected_at: data.lastConnectedAt ?? undefined,
    },
  });
}

export function updateNumberStatus(companyId, phoneNumber, status) {
  return prisma.whatsAppNumber.updateMany({
    where: { company_id: companyId, phone_number: phoneNumber },
    data: { status, last_connected_at: status === 'connected' ? new Date() : undefined },
  });
}

export function updateNumberById(id, data) {
  return prisma.whatsAppNumber.update({ where: { id }, data });
}

export function deleteNumber(companyId, id) {
  return prisma.whatsAppNumber.deleteMany({ where: { company_id: companyId, id } });
}

export function deleteNumberWithData(companyId, id) {
  return prisma.$transaction(async (tx) => {
    await tx.whatsAppMessage.deleteMany({ where: { company_id: companyId, whatsapp_number_id: id } });
    await tx.whatsAppContact.deleteMany({ where: { company_id: companyId, whatsapp_number_id: id } });
    await tx.whatsAppNumber.delete({ where: { id } });
  });
}

export function upsertContact(companyId, numberId, data) {
  return prisma.whatsAppContact.upsert({
    where: { whatsapp_number_id_phone_number: { whatsapp_number_id: numberId, phone_number: data.phoneNumber } },
    create: {
      company_id: companyId,
      whatsapp_number_id: numberId,
      customer_id: data.customerId ?? null,
      phone_number: data.phoneNumber,
      name: data.name ?? null,
      first_seen_at: new Date(),
      last_seen_at: new Date(),
      consent_status: data.consentStatus ?? 'unknown',
      metadata: data.metadata ?? undefined,
    },
    update: {
      name: data.name ?? undefined,
      last_seen_at: new Date(),
      metadata: data.metadata ?? undefined,
      consent_status: data.consentStatus ?? undefined,
    },
  });
}

export function createMessage(data) {
  return prisma.whatsAppMessage.create({ data });
}

export function updateContactMetadata(contactId, metadata) {
  return prisma.whatsAppContact.update({
    where: { id: contactId },
    data: { metadata },
  });
}

export function findMessageByExternalId(whatsappNumberId, externalMessageId) {
  return prisma.whatsAppMessage.findFirst({ where: { whatsapp_number_id: whatsappNumberId, external_message_id: externalMessageId } });
}

export function listMessages(companyId, numberId, { limit = 50, cursor } = {}) {
  return prisma.whatsAppMessage.findMany({
    where: { company_id: companyId, ...(numberId ? { whatsapp_number_id: numberId } : {}) },
    include: { whatsapp_number: { select: { id: true, phone_number: true, display_name: true } } },
    orderBy: { sent_at: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

export default {
  findNumberById,
  findNumberByPhone,
  findNumberByExternalAccountId,
  listNumbers,
  upsertNumber,
  updateNumberStatus,
  updateNumberById,
  deleteNumber,
  deleteNumberWithData,
  upsertContact,
  createMessage,
  updateContactMetadata,
  findMessageByExternalId,
  listMessages,
};