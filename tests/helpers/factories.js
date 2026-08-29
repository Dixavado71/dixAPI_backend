export const C1 = '00000000-0000-0000-0000-000000000001';

export function makeCompany(overrides = {}) {
  return {
    id: 'company-1',
    name: 'Loja Demo',
    trade_name: 'Demo LTDA',
    cnpj: '12345678000199',
    is_active: true,
    status: 'active',
    company_type: 'store',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeUser(overrides = {}) {
  return {
    id: 'user-1',
    name: 'Ana',
    email: 'ana@demo.com',
    password_hash: 'hash',
    role: 'admin',
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeCustomer(overrides = {}) {
  return {
    id: 'customer-1',
    company_id: C1,
    name: 'Maria',
    email: 'maria@demo.com',
    phone: '5511999999999',
    segment: 'new',
    status: 'active',
    total_orders: 0,
    total_spent: '0',
    registered_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeProduct(overrides = {}) {
  return {
    id: 'product-1',
    company_id: C1,
    name: 'Produto A',
    description: 'Desc',
    category: 'alimentacao',
    price: '10.00',
    cost: '5.00',
    stock: 10,
    min_stock: 5,
    total_sales: 0,
    total_revenue: '0',
    status: 'active',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeOrder(overrides = {}) {
  return {
    id: 'order-1',
    order_number: 'ORD-1',
    company_id: C1,
    customer_id: 'customer-1',
    status: 'pending',
    payment_method: 'pix',
    subtotal: '100.00',
    discount: '0',
    shipping_cost: '0',
    total: '100.00',
    order_date: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    order_items: [],
    customer: { id: 'customer-1', name: 'Maria' },
    payments: [],
    ...overrides,
  };
}

export function makeWhatsAppNumber(overrides = {}) {
  return {
    id: 'wa-1',
    company_id: C1,
    phone_number: '5511999999999',
    display_name: 'Loja',
    status: 'connected',
    is_bot_enabled: true,
    webhook_verified: true,
    external_account_id: 'inst1',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    _count: { messages: 0, contacts: 0 },
    ...overrides,
  };
}

export function makePaymentRecord(overrides = {}) {
  return {
    id: 'payment-1',
    company_id: C1,
    order_id: 'order-1',
    method: 'pix',
    channel: 'online',
    status: 'pending',
    amount: '100.00',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export default {
  C1,
  makeCompany,
  makeUser,
  makeCustomer,
  makeProduct,
  makeOrder,
  makeWhatsAppNumber,
  makePaymentRecord,
};