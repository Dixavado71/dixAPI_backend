# Estrutura Completa do Banco de Dados

## 1. Configuração

- **Projeto:** dixAPI_backend / ECMS6 DiixWhatsApp
- **Banco:** PostgreSQL
- **ORM:** Prisma
- **Identificador padrão:** UUID PostgreSQL (`String @db.Uuid`)
- **Schema:** `prisma/schema.prisma`
- **Total:** 30 modelos, 36 enums

## 2. Convenções

- `@id @default(uuid())`: chave primária UUID.
- `DateTime @default(now())`: data/hora criada automaticamente.
- `@updatedAt`: atualização automática.
- `?`: campo opcional, aceita `NULL`.
- `@default(...)`: valor padrão.
- `Decimal(p,s)`: valor decimal com precisão `p` e escala `s`.
- `Json`: JSON/JSONB no PostgreSQL.
- `@unique`: unicidade.
- `@@unique([...])`: unicidade composta.
- `@@index([...])`: índice.

## 3. Enums e valores permitidos

| Enum | Valores |
|---|---|
| `UserRole` | `master`, `reseller`, `admin`, `manager`, `operator`, `visitor` |
| `UserStatus` | `pending`, `active`, `inactive`, `suspended` |
| `CompanyType` | `store`, `demo`, `internal` |
| `CompanyStatus` | `pending`, `active`, `suspended`, `cancelled` |
| `AccountRole` | `owner`, `admin`, `manager`, `operator`, `driver`, `viewer`, `visitor` |
| `PlanCode` | `simple`, `silver`, `diamond` |
| `SubscriptionStatus` | `trialing`, `active`, `past_due`, `suspended`, `cancelled`, `expired` |
| `BillingCycle` | `monthly`, `yearly` |
| `FeatureValueType` | `boolean`, `integer`, `decimal`, `text`, `json` |
| `PlatformTransactionType` | `subscription`, `setup_fee`, `refund`, `adjustment`, `commission` |
| `PlatformTransactionStatus` | `pending`, `paid`, `failed`, `refunded`, `cancelled` |
| `CommissionStatus` | `pending`, `approved`, `paid`, `cancelled` |
| `PayoutStatus` | `pending`, `processing`, `paid`, `failed`, `cancelled` |
| `AuditAction` | `create`, `update`, `delete`, `login`, `logout`, `activate`, `suspend`, `cancel`, `payment`, `refund` |
| `CustomerSegment` | `vip`, `frequent`, `occasional`, `new` |
| `CustomerStatus` | `active`, `inactive` |
| `ProductStatus` | `active`, `inactive`, `low_stock` |
| `OrderStatus` | `pending`, `processing`, `completed`, `cancelled` |
| `PaymentMethod` | `credit_card`, `debit_card`, `pix`, `boleto`, `whatsapp_pay`, `cash_on_delivery`, `card_on_delivery` |
| `ConversationChannel` | `whatsapp`, `instagram`, `facebook`, `site` |
| `ConversationStatus` | `open`, `closed`, `waiting` |
| `MessageSenderType` | `user`, `customer`, `bot` |
| `MessageType` | `text`, `image`, `file`, `audio` |
| `MessageStatus` | `sent`, `delivered`, `read` |
| `AutomationFlowType` | `vendas`, `suporte`, `marketing` |
| `TransactionType` | `income`, `expense` |
| `TransactionStatus` | `pending`, `completed` |
| `NotificationType` | `order`, `message`, `payment`, `stock`, `automation` |
| `DeliveryMode` | `delivery`, `pickup` |
| `DeliveryStatus` | `pending`, `confirmed`, `preparing`, `ready_for_pickup`, `assigned`, `picked_up`, `in_transit`, `delivered`, `cancelled`, `failed` |
| `DeliveryProviderType` | `own`, `partner`, `marketplace` |
| `DriverStatus` | `available`, `unavailable`, `inactive` |
| `PaymentRecordStatus` | `pending`, `authorized`, `paid`, `failed`, `cancelled`, `refunded` |
| `PaymentChannel` | `online`, `whatsapp_manual`, `whatsapp_api`, `delivery_cash`, `delivery_card`, `delivery_pix` |

## 4. Modelos, tabelas e campos

### 4.1 Company → `companies`

| Campo | Tipo | Nulo | Default | Chave/índice |
|---|---|---|---|---|
| `id` | UUID | Não | UUID | PK |
| `name` | String | Não | — | — |
| `trade_name` | String | Sim | NULL | — |
| `cnpj` | String | Sim | NULL | UNIQUE, índice |
| `address_street` | String | Sim | NULL | — |
| `address_number` | String | Sim | NULL | — |
| `address_complement` | String | Sim | NULL | — |
| `address_city` | String | Sim | NULL | — |
| `address_state` | String | Sim | NULL | — |
| `address_zip` | String | Sim | NULL | — |
| `website` | String | Sim | NULL | — |
| `description` | String | Sim | NULL | — |
| `logo_url` | String | Sim | NULL | — |
| `is_active` | Boolean | Não | `true` | índice |
| `company_type` | CompanyType | Não | `store` | — |
| `status` | CompanyStatus | Não | `pending` | — |
| `reseller_id` | UUID | Sim | NULL | FK → `resellers.id` |
| `created_by` | UUID | Sim | NULL | — |
| `created_at` | DateTime | Não | `now()` | — |
| `updated_at` | DateTime | Não | `@updatedAt` | — |

Relações: `User[]`, `Customer[]`, `Product[]`, `Order[]`, `Conversation[]`, `AutomationFlow[]`, `Transaction[]`, `QuickReply[]`, `Notification[]`, `UserCompany[]`, `Reseller?`, `CompanySubscription?`, `PlatformTransaction[]`, `Commission[]`, `CompanyStatusHistory[]`, `AuditLog[]`, `DeliverySettings?`, `DeliveryZone[]`, `DeliveryDriver[]`, `Delivery[]`, `PaymentRecord[]`.

### 4.2 User → `users`

| Campo | Tipo | Nulo | Default | Chave/índice |
|---|---|---|---|---|
| `id` | UUID | Não | UUID | PK |
| `company_id` | UUID | Não | — | FK → `companies.id` |
| `name` | String | Não | — | — |
| `email` | String | Não | — | UNIQUE composto com `company_id` |
| `phone` | String | Sim | NULL | — |
| `avatar_url` | String | Sim | NULL | — |
| `password_hash` | String | Não | — | — |
| `role` | UserRole | Não | `operator` | índices |
| `language` | String | Não | `pt-BR` | — |
| `timezone` | String | Não | `America/Sao_Paulo` | — |
| `is_active` | Boolean | Não | `true` | índices |
| `last_login_at` | DateTime | Sim | NULL | — |
| `created_at` | DateTime | Não | `now()` | — |
| `updated_at` | DateTime | Não | `@updatedAt` | — |

Índices: `[company_id]`, `[company_id, role, is_active]`, `[email]`, `[role]`, `[is_active]`. Relações: `Company`, `Conversation[]`, `Notification[]`, `RefreshToken[]`, `QuickReply[]`, `UserCompany[]`, `Reseller?`.

### 4.3 Customer → `customers`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `company_id` | UUID | Não | — |
| `name` | String | Não | — |
| `email` | String | Sim | NULL |
| `phone` | String | Não | — |
| `segment` | CustomerSegment | Não | `new` |
| `status` | CustomerStatus | Não | `active` |
| `total_orders` | Integer | Não | `0` |
| `total_spent` | Decimal(10,2) | Não | `0` |
| `last_purchase_date` | Date | Sim | NULL |
| `registered_at` | Date | Não | `now()` |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

Índices: `[company_id]`, `[company_id, segment, status]`, `[company_id, email, phone]`, `[segment]`, `[status]`, `[phone]`, `[email]`. Relações: `Company`, `Order[]`, `Conversation[]`.

### 4.4 Product → `products`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `company_id` | UUID | Não | — |
| `name` | String | Não | — |
| `description` | String | Sim | NULL |
| `category` | String | Não | — |
| `price` | Decimal(10,2) | Não | — |
| `cost` | Decimal(10,2) | Não | `0` |
| `stock` | Integer | Não | `0` |
| `min_stock` | Integer | Não | `5` |
| `total_sales` | Integer | Não | `0` |
| `total_revenue` | Decimal(10,2) | Não | `0` |
| `status` | ProductStatus | Não | `active` |
| `image_url` | String | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

Índices: `[company_id]`, `[category]`, `[status]`. Relações: `Company`, `OrderItem[]`.

### 4.5 Order → `orders`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `order_number` | String | Não | — |
| `company_id` | UUID | Não | — |
| `customer_id` | UUID | Não | — |
| `status` | OrderStatus | Não | `pending` |
| `payment_method` | PaymentMethod | Não | — |
| `subtotal` | Decimal(10,2) | Não | — |
| `discount` | Decimal(10,2) | Não | `0` |
| `shipping_cost` | Decimal(10,2) | Não | `0` |
| `total` | Decimal(10,2) | Não | — |
| `shipping_address` | String | Sim | NULL |
| `notes` | String | Sim | NULL |
| `order_date` | DateTime | Não | `now()` |
| `completed_at` | DateTime | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

Chave única: `[company_id, order_number]`. Índices: `[company_id, customer_id]`, `[company_id, status, order_date]`, `[company_id, order_date]`. Relações: `Company`, `Customer`, `OrderItem[]`, `Transaction[]`, `Delivery?`, `PaymentRecord[]`.

### 4.6 OrderItem → `order_items`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `order_id` | UUID | Não | — |
| `product_id` | UUID | Não | — |
| `quantity` | Integer | Não | — |
| `unit_price` | Decimal(10,2) | Não | — |
| `unit_cost` | Decimal(10,2) | Sim | NULL |
| `subtotal` | Decimal(10,2) | Não | — |
| `created_at` | DateTime | Não | `now()` |

Índices: `[order_id]`, `[product_id]`. Relações: `Order` e `Product`.

### 4.7 Conversation → `conversations`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `company_id` | UUID | Não | — |
| `customer_id` | UUID | Sim | NULL |
| `channel` | ConversationChannel | Não | — |
| `contact_name` | String | Não | — |
| `contact_phone` | String | Sim | NULL |
| `last_message` | String | Sim | NULL |
| `last_message_at` | DateTime | Sim | NULL |
| `unread_count` | Integer | Não | `0` |
| `is_pinned` | Boolean | Não | `false` |
| `is_archived` | Boolean | Não | `false` |
| `assigned_to` | UUID | Sim | NULL |
| `status` | ConversationStatus | Não | `open` |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

Índices: `[company_id]`, `[channel]`, `[status]`, `[assigned_to]`, `[customer_id]`. Relações: `Company`, `Customer?`, `User?`, `Message[]`.

### 4.8 Message → `messages`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `conversation_id` | UUID | Não | — |
| `sender_type` | MessageSenderType | Não | — |
| `sender_id` | UUID | Sim | NULL |
| `message_type` | MessageType | Não | `text` |
| `content` | String | Não | — |
| `media_url` | String | Sim | NULL |
| `status` | MessageStatus | Não | `sent` |
| `is_read` | Boolean | Não | `false` |
| `read_at` | DateTime | Sim | NULL |
| `sent_at` | DateTime | Não | `now()` |
| `created_at` | DateTime | Não | `now()` |

Índices: `[conversation_id]`, `[sender_type]`, `[created_at]`. Relação: `Conversation`.

### 4.9 AutomationFlow → `automation_flows`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `company_id` | UUID | Não | — |
| `name` | String | Não | — |
| `type` | AutomationFlowType | Não | — |
| `description` | String | Sim | NULL |
| `icon_emoji` | String | Sim | NULL |
| `messages_count` | Integer | Não | `0` |
| `total_conversions` | Integer | Não | `0` |
| `conversion_rate` | Decimal(5,2) | Não | `0` |
| `growth_percentage` | Decimal(5,2) | Não | `0` |
| `is_active` | Boolean | Não | `true` |
| `config_json` | Json | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

Índices: `[company_id]`, `[type]`, `[is_active]`. Relação: `Company`.

### 4.10 Transaction → `transactions`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `company_id` | UUID | Não | — |
| `order_id` | UUID | Sim | NULL |
| `description` | String | Não | — |
| `type` | TransactionType | Não | — |
| `category` | String | Não | — |
| `value` | Decimal(12,2) | Não | — |
| `status` | TransactionStatus | Não | `pending` |
| `payment_method` | PaymentMethod | Sim | NULL |
| `transaction_date` | Date | Não | — |
| `due_date` | Date | Sim | NULL |
| `paid_at` | DateTime | Sim | NULL |
| `notes` | String | Sim | NULL |
| `attachment_url` | String | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

Índices: `[company_id]`, `[order_id]`, `[type]`, `[status]`, `[transaction_date]`. Relações: `Company`, `Order?`.

### 4.11 QuickReply → `quick_replies`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `company_id` | UUID | Não | — |
| `shortcut` | String | Não | — |
| `message_text` | String | Não | — |
| `created_by` | UUID | Sim | NULL |
| `usage_count` | Integer | Não | `0` |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

Chave única: `[company_id, shortcut]`. Índices: `[company_id]`, `[shortcut]`. Relações: `Company`, `User?`.

### 4.12 Notification → `notifications`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `user_id` | UUID | Não | — |
| `company_id` | UUID | Não | — |
| `type` | NotificationType | Não | — |
| `title` | String | Não | — |
| `message` | String | Não | — |
| `is_read` | Boolean | Não | `false` |
| `related_entity_type` | String | Sim | NULL |
| `related_entity_id` | UUID | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |

Índices: `[user_id]`, `[company_id]`, `[is_read]`, `[type]`. Relações: `User`, `Company`.

### 4.13 UserCompany → `user_companies`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `user_id` | UUID | Não | — |
| `company_id` | UUID | Não | — |
| `role` | AccountRole | Não | `operator` |
| `permissions` | Json | Sim | NULL |
| `is_primary` | Boolean | Não | `false` |
| `status` | UserStatus | Não | `active` |
| `invited_by` | UUID | Sim | NULL |
| `joined_at` | DateTime | Sim | NULL |
| `removed_at` | DateTime | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

Chave única: `[user_id, company_id]`. Índice: `[company_id, role, status]`. Relações: `User`, `Company`.

### 4.14 Reseller → `resellers`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `user_id` | UUID | Não | — |
| `name` | String | Não | — |
| `legal_name` | String | Sim | NULL |
| `document` | String | Sim | NULL |
| `email` | String | Não | — |
| `phone` | String | Sim | NULL |
| `commission_type` | String | Não | `percentage` |
| `commission_value` | Decimal(10,2) | Não | `0` |
| `status` | UserStatus | Não | `active` |
| `created_by` | UUID | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

`user_id` é único. Índice: `[status]`. Relações: `User`, `Company[]`, `Commission[]`, `PlatformTransaction[]`, `Payout[]`.

### 4.15 Plan → `plans`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `code` | PlanCode | Não | — |
| `name` | String | Não | — |
| `description` | String | Sim | NULL |
| `monthly_price` | Decimal(12,2) | Não | — |
| `yearly_price` | Decimal(12,2) | Não | — |
| `trial_days` | Integer | Não | `0` |
| `max_users` | Integer | Sim | NULL |
| `max_products` | Integer | Sim | NULL |
| `max_orders_month` | Integer | Sim | NULL |
| `max_drivers` | Integer | Sim | NULL |
| `is_active` | Boolean | Não | `true` |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

`code` é único. Relações: `PlanFeature[]`, `CompanySubscription[]`.

### 4.16 PlanFeature → `plan_features`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `plan_id` | UUID | Não | — |
| `key` | String | Não | — |
| `name` | String | Não | — |
| `description` | String | Sim | NULL |
| `value_type` | FeatureValueType | Não | — |
| `boolean_value` | Boolean | Sim | NULL |
| `integer_value` | Integer | Sim | NULL |
| `decimal_value` | Decimal(12,2) | Sim | NULL |
| `text_value` | String | Sim | NULL |
| `json_value` | Json | Sim | NULL |

Chave única: `[plan_id, key]`. Relação: `Plan`.

### 4.17 CompanySubscription → `company_subscriptions`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `company_id` | UUID | Não | — |
| `plan_id` | UUID | Não | — |
| `status` | SubscriptionStatus | Não | `trialing` |
| `billing_cycle` | BillingCycle | Não | `monthly` |
| `price` | Decimal(12,2) | Não | — |
| `started_at` | DateTime | Não | `now()` |
| `current_period_start` | DateTime | Não | — |
| `current_period_end` | DateTime | Não | — |
| `trial_ends_at` | DateTime | Sim | NULL |
| `grace_ends_at` | DateTime | Sim | NULL |
| `cancel_at_period_end` | Boolean | Não | `false` |
| `cancelled_at` | DateTime | Sim | NULL |
| `external_customer_id` | String | Sim | NULL |
| `external_subscription_id` | String | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

`company_id` é único. Índice: `[status, current_period_end]`. Relações: `Company`, `Plan`, `SubscriptionEvent[]`, `PlatformTransaction[]`.

### 4.18 SubscriptionEvent → `subscription_events`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `subscription_id` | UUID | Não | — |
| `event_type` | String | Não | — |
| `previous_status` | SubscriptionStatus | Sim | NULL |
| `new_status` | SubscriptionStatus | Sim | NULL |
| `previous_plan_id` | UUID | Sim | NULL |
| `new_plan_id` | UUID | Sim | NULL |
| `metadata` | Json | Sim | NULL |
| `created_by` | UUID | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |

Índice: `[subscription_id, created_at]`. Relação: `CompanySubscription`.

### 4.19 PlatformTransaction → `platform_transactions`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `company_id` | UUID | Não | — |
| `reseller_id` | UUID | Sim | NULL |
| `subscription_id` | UUID | Sim | NULL |
| `type` | PlatformTransactionType | Não | — |
| `status` | PlatformTransactionStatus | Não | `pending` |
| `amount` | Decimal(12,2) | Não | — |
| `currency` | String | Não | `BRL` |
| `external_reference` | String | Sim | NULL |
| `paid_at` | DateTime | Sim | NULL |
| `refunded_at` | DateTime | Sim | NULL |
| `notes` | String | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

Índices: `[company_id, status, created_at]`, `[reseller_id, status]`. Relações: `Company`, `Reseller?`, `CompanySubscription?`, `Commission[]`.

### 4.20 Commission → `commissions`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `reseller_id` | UUID | Não | — |
| `company_id` | UUID | Não | — |
| `platform_transaction_id` | UUID | Sim | NULL |
| `type` | String | Não | — |
| `rate` | Decimal(7,4) | Não | — |
| `base_amount` | Decimal(12,2) | Não | — |
| `amount` | Decimal(12,2) | Não | — |
| `status` | CommissionStatus | Não | `pending` |
| `approved_at` | DateTime | Sim | NULL |
| `paid_at` | DateTime | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

Índices: `[reseller_id, status]`, `[company_id, status]`. Relações: `Reseller`, `Company`, `PlatformTransaction?`.

### 4.21 Payout → `payouts`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `reseller_id` | UUID | Não | — |
| `amount` | Decimal(12,2) | Não | — |
| `status` | PayoutStatus | Não | `pending` |
| `period_start` | DateTime | Não | — |
| `period_end` | DateTime | Não | — |
| `external_reference` | String | Sim | NULL |
| `paid_at` | DateTime | Sim | NULL |
| `notes` | String | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

Índice: `[reseller_id, status, period_end]`. Relação: `Reseller`.

### 4.22 CompanyStatusHistory → `company_status_history`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `company_id` | UUID | Não | — |
| `from_status` | CompanyStatus | Sim | NULL |
| `to_status` | CompanyStatus | Não | — |
| `reason` | String | Sim | NULL |
| `changed_by` | UUID | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |

Índice: `[company_id, created_at]`. Relação: `Company`.

### 4.23 AuditLog → `audit_logs`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `company_id` | UUID | Sim | NULL |
| `user_id` | UUID | Sim | NULL |
| `action` | AuditAction | Não | — |
| `entity_type` | String | Não | — |
| `entity_id` | String | Sim | NULL |
| `before_data` | Json | Sim | NULL |
| `after_data` | Json | Sim | NULL |
| `ip_address` | String | Sim | NULL |
| `user_agent` | String | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |

Índices: `[company_id, created_at]`, `[user_id, created_at]`, `[entity_type, entity_id]`. Relação: `Company?`.

### 4.24 RefreshToken → `refresh_tokens`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `user_id` | UUID | Não | — |
| `token_hash` | String | Não | — |
| `expires_at` | DateTime | Não | — |
| `revoked_at` | DateTime | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |

`token_hash` é único. Índices: `[user_id, revoked_at]`, `[expires_at]`. Relação: `User`.

### 4.25 DeliverySettings → `DeliverySettings`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `company_id` | UUID | Não | — |
| `enabled` | Boolean | Não | `false` |
| `pickup_enabled` | Boolean | Não | `true` |
| `minimum_order_value` | Decimal(12,2) | Não | `0` |
| `default_delivery_fee` | Decimal(10,2) | Não | `0` |
| `estimated_min_minutes` | Integer | Não | `30` |
| `estimated_max_minutes` | Integer | Não | `60` |
| `service_start` | String | Sim | NULL |
| `service_end` | String | Sim | NULL |
| `accepted_payments` | Json | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

`company_id` é único. Relação: `Company`.

### 4.26 DeliveryZone → `delivery_zones`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `company_id` | UUID | Não | — |
| `name` | String | Não | — |
| `postal_codes` | String[] | Não | — |
| `neighborhoods` | String[] | Não | — |
| `delivery_fee` | Decimal(10,2) | Não | `0` |
| `minimum_order` | Decimal(12,2) | Não | `0` |
| `estimated_min` | Integer | Não | `30` |
| `estimated_max` | Integer | Não | `60` |
| `is_active` | Boolean | Não | `true` |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

Índice: `[company_id, is_active]`. Relações: `Company`, `Delivery[]`.

### 4.27 DeliveryDriver → `delivery_drivers`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `company_id` | UUID | Não | — |
| `name` | String | Não | — |
| `phone` | String | Não | — |
| `document` | String | Sim | NULL |
| `vehicle_type` | String | Sim | NULL |
| `vehicle_plate` | String | Sim | NULL |
| `status` | DriverStatus | Não | `unavailable` |
| `provider_type` | DeliveryProviderType | Não | `own` |
| `is_active` | Boolean | Não | `true` |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

Índice: `[company_id, status, is_active]`. Relações: `Company`, `Delivery[]`.

### 4.28 Delivery → `deliveries`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `company_id` | UUID | Não | — |
| `order_id` | UUID | Não | — |
| `zone_id` | UUID | Sim | NULL |
| `driver_id` | UUID | Sim | NULL |
| `mode` | DeliveryMode | Não | `delivery` |
| `status` | DeliveryStatus | Não | `pending` |
| `recipient_name` | String | Não | — |
| `recipient_phone` | String | Não | — |
| `address_street` | String | Sim | NULL |
| `address_number` | String | Sim | NULL |
| `address_complement` | String | Sim | NULL |
| `address_neighborhood` | String | Sim | NULL |
| `address_city` | String | Sim | NULL |
| `address_state` | String | Sim | NULL |
| `address_zip` | String | Sim | NULL |
| `latitude` | Decimal(10,7) | Sim | NULL |
| `longitude` | Decimal(10,7) | Sim | NULL |
| `delivery_fee` | Decimal(10,2) | Não | `0` |
| `change_for` | Decimal(10,2) | Sim | NULL |
| `delivery_notes` | String | Sim | NULL |
| `dispatched_at` | DateTime | Sim | NULL |
| `delivered_at` | DateTime | Sim | NULL |
| `failure_reason` | String | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

`order_id` é único. Índices: `[company_id, status]`, `[driver_id, status]`. Relações: `Company`, `Order`, `DeliveryZone?`, `DeliveryDriver?`, `PaymentRecord[]`.

### 4.29 PaymentRecord → `payment_records`

| Campo | Tipo | Nulo | Default |
|---|---|---|---|
| `id` | UUID | Não | UUID |
| `company_id` | UUID | Não | — |
| `order_id` | UUID | Não | — |
| `delivery_id` | UUID | Sim | NULL |
| `method` | PaymentMethod | Não | — |
| `channel` | PaymentChannel | Não | — |
| `status` | PaymentRecordStatus | Não | `pending` |
| `amount` | Decimal(12,2) | Não | — |
| `amount_received` | Decimal(12,2) | Sim | NULL |
| `change_amount` | Decimal(12,2) | Sim | NULL |
| `external_reference` | String | Sim | NULL |
| `provider` | String | Sim | NULL |
| `proof_url` | String | Sim | NULL |
| `confirmed_by_driver` | Boolean | Não | `false` |
| `confirmed_at` | DateTime | Sim | NULL |
| `notes` | String | Sim | NULL |
| `created_at` | DateTime | Não | `now()` |
| `updated_at` | DateTime | Não | `@updatedAt` |

Índices: `[company_id, status, method]`, `[order_id]`. Relações: `Company`, `Order`, `Delivery?`.

## 5. Ordem estrutural dos relacionamentos

```text
Company
├── User
├── UserCompany
├── Customer
│   ├── Order
│   └── Conversation
├── Product
│   └── OrderItem
├── Order
│   ├── OrderItem
│   ├── Transaction
│   ├── Delivery
│   └── PaymentRecord
├── Conversation
│   └── Message
├── AutomationFlow
├── QuickReply
├── Notification
├── DeliverySettings
├── DeliveryZone
├── DeliveryDriver
├── CompanySubscription
├── PlatformTransaction
├── Commission
├── CompanyStatusHistory
└── AuditLog

User
├── UserCompany
├── Conversation atribuída
├── Notification
├── RefreshToken
├── QuickReply criada
└── Reseller

Reseller
├── Company
├── PlatformTransaction
├── Commission
└── Payout

Plan
├── PlanFeature
└── CompanySubscription

CompanySubscription
├── SubscriptionEvent
└── PlatformTransaction

Delivery
├── DeliveryZone
├── DeliveryDriver
└── PaymentRecord
```

## 6. Regras de exclusão dos relacionamentos

| Relação | Ação |
|---|---|
| Empresa → registros dependentes principais | `Cascade` |
| Revendedor associado à empresa | `SetNull` |
| Usuário → empresa principal | `Cascade` |
| Cliente associado ao pedido | `Restrict` |
| Pedido → itens | `Cascade` |
| Produto associado ao item | `Restrict` |
| Conversa → mensagens | `Cascade` |
| Cliente atribuído à conversa | `SetNull` |
| Usuário atribuído à conversa | `SetNull` |
| Empresa → assinatura | `Cascade` |
| Plano associado à assinatura | `Restrict` |
| Assinatura → eventos | `Cascade` |
| Revendedor em transação da plataforma | `SetNull` |
| Assinatura em transação da plataforma | `SetNull` |
| Criador de resposta rápida | `SetNull` |
| Delivery → pedido | `Cascade` |
| Zona em delivery | `SetNull` |
| Driver em delivery | `SetNull` |
| Delivery em pagamento | `SetNull` |
| Usuário → refresh tokens | `Cascade` |
| Empresa em auditoria | `SetNull` |

## 7. Organização por domínio

### Identidade e multiempresa
`companies`, `users`, `user_companies`, `resellers`, `refresh_tokens`, `audit_logs`.

### Clientes e vendas
`customers`, `products`, `orders`, `order_items`.

### Comunicação e automação
`conversations`, `messages`, `automation_flows`, `quick_replies`, `notifications`.

### Financeiro da loja
`transactions`.

### Planos e assinaturas
`plans`, `plan_features`, `company_subscriptions`, `subscription_events`.

### Financeiro da plataforma
`platform_transactions`, `commissions`, `payouts`.

### Delivery
`delivery_settings`, `delivery_zones`, `delivery_drivers`, `deliveries`.

### Pagamentos
`payment_records`.

### Histórico e auditoria
`company_status_history`, `audit_logs`.

## 8. Mapa resumido de chaves

### Chaves primárias
Todos os 30 modelos possuem campo `id` UUID como chave primária.

### Chaves únicas

- `companies.cnpj`
- `users(company_id, email)`
- `orders(company_id, order_number)`
- `quick_replies(company_id, shortcut)`
- `user_companies(user_id, company_id)`
- `resellers.user_id`
- `plans.code`
- `plan_features(plan_id, key)`
- `company_subscriptions.company_id`
- `delivery_settings.company_id`
- `deliveries.order_id`
- `refresh_tokens.token_hash`

### Relacionamentos centrais

- `users.company_id` → `companies.id`
- `customers.company_id` → `companies.id`
- `products.company_id` → `companies.id`
- `orders.company_id` → `companies.id`
- `orders.customer_id` → `customers.id`
- `order_items.order_id` → `orders.id`
- `order_items.product_id` → `products.id`
- `conversations.company_id` → `companies.id`
- `messages.conversation_id` → `conversations.id`
- `deliveries.order_id` → `orders.id`
- `payment_records.order_id` → `orders.id`
- `company_subscriptions.plan_id` → `plans.id`
- `platform_transactions.company_id` → `companies.id`
- `commissions.reseller_id` → `resellers.id`

## 9. Tabelas físicas

```text
companies
users
customers
products
orders
order_items
conversations
messages
automation_flows
transactions
quick_replies
notifications
user_companies
resellers
plans
plan_features
company_subscriptions
subscription_events
platform_transactions
commissions
payouts
company_status_history
audit_logs
refresh_tokens
DeliverySettings
delivery_zones
delivery_drivers
deliveries
payment_records
```

Fonte estrutural: `prisma/schema.prisma`. Este arquivo contém somente a organização estrutural, campos, valores, chaves e relações do banco.
