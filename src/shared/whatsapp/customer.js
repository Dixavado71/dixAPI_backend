import * as whatsappRepo from '../../modules/whatsapp/repositories/whatsappRepository.js';
import * as evolutionApi from '../../infrastructure/whatsapp/evolutionApiClient.js';
import { cleanPhone, resolveContactName } from './phone.js';
import { createCustomer } from '../../modules/customers/services/customerService.js';

const REGISTER_CUSTOMER_RE = /^\/(?:cadastrar|cliente)\b\s*(.*)$/i;

export async function findOrCreateCustomer({ companyId, whatsappNumberId, phone, preferredName = null }) {
  let customer = await whatsappRepo.findCustomerByPhone(companyId, phone).catch(() => null);
  if (customer) return customer;
  const contact = await whatsappRepo.findContactByPhone(companyId, whatsappNumberId, phone).catch(() => null);
  const name = String(preferredName || resolveContactName(contact) || phone).slice(0, 120);
  customer = await createCustomer(companyId, { name, phone, segment: 'new' });
  return customer;
}

export async function handleCustomerCommand(companyId, number, to, rawText) {
  const match = rawText.match(REGISTER_CUSTOMER_RE);
  if (!match) return null;
  const phone = cleanPhone(to);
  if (!phone) return null;
  const providedName = match[1].trim();
  const customer = await findOrCreateCustomer({ companyId, whatsappNumberId: number.id, phone, preferredName: providedName || null });
  const name = customer.name || phone;
  await evolutionApi.sendText(
    number.external_account_id,
    to,
    `\u2705 ${name} ja e cliente cadastrado.`,
  ).catch(() => null);
  return { registered: true, customer };
}

export default { findOrCreateCustomer, handleCustomerCommand };