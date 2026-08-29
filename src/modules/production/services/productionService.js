import * as repo from '../repositories/productionRepository.js';
import * as evolutionApi from '../../../infrastructure/whatsapp/evolutionApiClient.js';
import * as whatsappRepo from '../../whatsapp/repositories/whatsappRepository.js';
import { logger } from '../../../config/logger.js';

const WEEKDAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };

function normalizeWorkingDays(workingDays) {
  if (!Array.isArray(workingDays) || workingDays.length === 0) return [1, 2, 3, 4, 5];
  const indexes = workingDays
    .map((d) => {
      if (typeof d === 'number') return d;
      const key = String(d).toLowerCase();
      return WEEKDAY_INDEX[key] !== undefined ? WEEKDAY_INDEX[key] : null;
    })
    .filter((d) => d !== null && d >= 0 && d <= 6);
  return indexes.length > 0 ? [...new Set(indexes)] : [1, 2, 3, 4, 5];
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addBusinessDays(start, days, workingDays) {
  const weekdays = normalizeWorkingDays(workingDays);
  let d = startOfDay(start);
  let remaining = Math.max(days, 0);
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    if (weekdays.includes(d.getDay())) remaining -= 1;
  }
  return d;
}

export function formatDateBR(date) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR');
}

export function getSettings(companyId) {
  return repo.findSettings(companyId);
}

export function saveSettings(companyId, data) {
  return repo.upsertSettings(companyId, data);
}

export async function estimateOrderDays(companyId, orderId) {
  const order = await repo.findOrderWithItems(companyId, orderId);
  if (!order) return 1;
  const items = order.order_items ?? [];
  if (items.length === 0) return 1;
  const totalDays = items.reduce((acc, i) => {
    const days = i.product?.estimated_production_days ?? 1;
    return acc + Math.max(days, 1) * Math.max(i.quantity, 1);
  }, 0);
  return Math.max(totalDays, 1);
}

export async function getNextAvailableDate(companyId, estimatedDays) {
  const settings = await repo.findSettings(companyId);
  const workingDays = settings?.working_days ?? null;
  const last = await repo.findLastSchedule(companyId);
  const base = last?.scheduled_date ? startOfDay(last.scheduled_date) : startOfDay(new Date());
  const start = addBusinessDays(base, 1, workingDays);
  const completion = addBusinessDays(start, Math.max(estimatedDays, 1) - 1, workingDays);
  const eta = addBusinessDays(completion, 1, workingDays);
  return { start, completion, eta, settings };
}

export async function scheduleOrder(companyId, orderId) {
  const estimatedDays = await estimateOrderDays(companyId, orderId);
  const { start, completion, eta } = await getNextAvailableDate(companyId, estimatedDays);
  const existing = await repo.findScheduleByOrder(companyId, orderId);

  if (existing) {
    await repo.updateSchedule(companyId, existing.id, { scheduled_date: start, notes: `Produção estimada em ${estimatedDays} dia(s), conclusão ${formatDateBR(completion)}` });
  } else {
    await repo.createSchedule(companyId, {
      order_id: orderId,
      scheduled_date: start,
      notes: `Produção estimada em ${estimatedDays} dia(s), conclusão ${formatDateBR(completion)}`,
    });
  }

  await repo.updateOrderDates(companyId, orderId, {
    expected_completion_at: completion,
    delivery_eta_at: eta,
  });

  return { estimatedDays, start, completion, eta };
}

export async function getWorkflowReport(companyId) {
  const schedules = await repo.listScheduledOrders(companyId);
  if (schedules.length === 0) return 'Nenhum pedido agendado em produção.';
  const lines = schedules.map((s) => {
    const order = s.order;
    const name = order?.customer?.name ?? 'Cliente';
    const status = s.status === 'in_progress' ? 'EM PRODUÇÃO' : s.status === 'completed' ? 'CONCLUÍDO' : 'AGENDADO';
    return `\u2022 ${order?.order_number ?? s.order_id} \u2014 ${name} \u2014 ${formatDateBR(s.scheduled_date)} \u2014 ${status}`;
  });
  return `\u{1F4CB} *Fluxo de trabalho (produção)*\n\n${lines.join('\n')}`;
}

export async function sendWorkflowReportToOwner(companyId, number) {
  try {
    const report = await getWorkflowReport(companyId);
    const bc = (await whatsappRepo.getBotConfig(companyId).catch(() => ({}))) ?? {};
    const ownerPhone = String(bc?.ownerPhone || bc?.atendentePhone || '').replace(/\D/g, '');
    if (!ownerPhone || !number?.external_account_id) return null;
    const result = await evolutionApi.sendText(number.external_account_id, ownerPhone, report, 300).catch((err) => {
      logger.error({ err: err.message, companyId, ownerPhone }, 'production: falha ao enviar relatório de fluxo de trabalho');
      return null;
    });
    return result;
  } catch (err) {
    logger.error({ err: err.message, companyId }, 'production: erro ao enviar relatório de fluxo de trabalho');
    return null;
  }
}

export default {
  getSettings,
  saveSettings,
  estimateOrderDays,
  getNextAvailableDate,
  scheduleOrder,
  getWorkflowReport,
  sendWorkflowReportToOwner,
  addBusinessDays,
  formatDateBR,
};
