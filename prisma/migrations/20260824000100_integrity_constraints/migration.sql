-- Tenant-safe uniqueness and financial domain checks.
-- Apply only after validating existing data in a controlled database.
DROP INDEX IF EXISTS "orders_order_number_key";
CREATE UNIQUE INDEX "orders_company_id_order_number_key" ON "orders"("company_id", "order_number");

ALTER TABLE "products"
  ADD CONSTRAINT "products_stock_non_negative" CHECK ("stock" >= 0),
  ADD CONSTRAINT "products_min_stock_non_negative" CHECK ("min_stock" >= 0),
  ADD CONSTRAINT "products_price_non_negative" CHECK ("price" >= 0),
  ADD CONSTRAINT "products_cost_non_negative" CHECK ("cost" >= 0);

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "order_items_unit_price_non_negative" CHECK ("unit_price" >= 0),
  ADD CONSTRAINT "order_items_subtotal_non_negative" CHECK ("subtotal" >= 0),
  ADD CONSTRAINT "order_items_unit_cost_non_negative" CHECK ("unit_cost" IS NULL OR "unit_cost" >= 0);

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_subtotal_non_negative" CHECK ("subtotal" >= 0),
  ADD CONSTRAINT "orders_discount_non_negative" CHECK ("discount" >= 0),
  ADD CONSTRAINT "orders_shipping_cost_non_negative" CHECK ("shipping_cost" >= 0),
  ADD CONSTRAINT "orders_total_non_negative" CHECK ("total" >= 0);

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_value_non_negative" CHECK ("value" >= 0);

ALTER TABLE "plans"
  ADD CONSTRAINT "plans_monthly_price_non_negative" CHECK ("monthly_price" >= 0),
  ADD CONSTRAINT "plans_yearly_price_non_negative" CHECK ("yearly_price" >= 0),
  ADD CONSTRAINT "plans_trial_days_non_negative" CHECK ("trial_days" >= 0);

ALTER TABLE "company_subscriptions"
  ADD CONSTRAINT "company_subscriptions_price_non_negative" CHECK ("price" >= 0),
  ADD CONSTRAINT "company_subscriptions_period_valid" CHECK ("current_period_end" > "current_period_start");

ALTER TABLE "platform_transactions"
  ADD CONSTRAINT "platform_transactions_amount_non_negative" CHECK ("amount" >= 0);

ALTER TABLE "commissions"
  ADD CONSTRAINT "commissions_rate_non_negative" CHECK ("rate" >= 0),
  ADD CONSTRAINT "commissions_base_amount_non_negative" CHECK ("base_amount" >= 0),
  ADD CONSTRAINT "commissions_amount_non_negative" CHECK ("amount" >= 0);

ALTER TABLE "payouts"
  ADD CONSTRAINT "payouts_amount_non_negative" CHECK ("amount" >= 0),
  ADD CONSTRAINT "payouts_period_valid" CHECK ("period_end" > "period_start");

ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_delivery_fee_non_negative" CHECK ("delivery_fee" >= 0),
  ADD CONSTRAINT "deliveries_change_for_non_negative" CHECK ("change_for" IS NULL OR "change_for" >= 0);

ALTER TABLE "payment_records"
  ADD CONSTRAINT "payment_records_amount_non_negative" CHECK ("amount" >= 0),
  ADD CONSTRAINT "payment_records_amount_received_non_negative" CHECK ("amount_received" IS NULL OR "amount_received" >= 0),
  ADD CONSTRAINT "payment_records_change_amount_non_negative" CHECK ("change_amount" IS NULL OR "change_amount" >= 0),
  ADD CONSTRAINT "payment_records_received_covers_amount" CHECK ("amount_received" IS NULL OR "amount_received" >= "amount");
