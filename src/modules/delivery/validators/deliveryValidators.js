import { z } from 'zod';

export const idParamsSchema = z.object({ id: z.string().uuid() }).strict();

const decimal = z.number().finite().nonnegative();

export const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  pickup_enabled: z.boolean().optional(),
  minimum_order_value: decimal.optional(),
  default_delivery_fee: decimal.optional(),
  estimated_min_minutes: z.number().int().positive().optional(),
  estimated_max_minutes: z.number().int().positive().optional(),
  service_start: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/).nullable().optional(),
  service_end: z.string().regex(/^([01]\\d|2[0-3]):[0-5]\\d$/).nullable().optional(),
  accepted_payments: z.array(z.string()).nullable().optional(),
}).strict().refine(data => Object.keys(data).length > 0, { message: 'At least one setting must be provided' });

export const driverSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(5),
  document: z.string().optional(),
  vehicle_type: z.string().optional(),
  vehicle_plate: z.string().optional(),
  status: z.enum(['available', 'unavailable', 'inactive']).optional(),
  provider_type: z.enum(['own', 'partner', 'marketplace']).optional(),
}).strict();

export const deliverySchema = z.object({
  order_id: z.string().uuid(),
  zone_id: z.string().uuid().nullable().optional(),
  driver_id: z.string().uuid().nullable().optional(),
  mode: z.enum(['delivery', 'pickup']).default('delivery'),
  recipient_name: z.string().min(2),
  recipient_phone: z.string().min(5),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_neighborhood: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  latitude: z.number().finite().optional(),
  longitude: z.number().finite().optional(),
  delivery_fee: decimal.default(0),
  change_for: decimal.nullable().optional(),
  delivery_notes: z.string().optional(),
}).strict();

export const statusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed']),
  failure_reason: z.string().optional(),
}).strict();

export const paymentSchema = z.object({
  order_id: z.string().uuid(),
  delivery_id: z.string().uuid().nullable().optional(),
  method: z.enum(['credit_card', 'debit_card', 'pix', 'boleto', 'whatsapp_pay', 'cash_on_delivery', 'card_on_delivery']),
  channel: z.enum(['online', 'whatsapp_manual', 'whatsapp_api', 'delivery_cash', 'delivery_card', 'delivery_pix']),
  amount: decimal,
  amount_received: decimal.nullable().optional(),
  external_reference: z.string().optional(),
  provider: z.string().optional(),
  proof_url: z.string().url().optional(),
  confirmed_by_driver: z.boolean().optional(),
  notes: z.string().optional(),
}).strict();

export const confirmPaymentSchema = z.object({
  amount_received: decimal,
}).strict();
