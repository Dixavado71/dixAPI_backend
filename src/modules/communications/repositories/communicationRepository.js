import prisma from '../../../infrastructure/database/prismaClient.js';

export function listCommunications(companyId) {
  return prisma.communication.findMany({ where: { company_id: companyId }, orderBy: { created_at: 'desc' }, take: 100 });
}

export function createCommunication(companyId, senderId, data) {
  return prisma.communication.create({
    data: {
      company_id: companyId,
      sender_id: senderId,
      title: data.title,
      body: data.body,
      audience: data.audience,
      channel: data.channel,
      priority: data.priority ?? 'normal',
      status: data.scheduledAt ? 'scheduled' : 'draft',
      scheduled_at: data.scheduledAt,
    },
  });
}
