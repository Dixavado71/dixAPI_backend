-- Índices de performance para consultas de dashboard, auditoria e mensagens

-- Conversas por status e última atualização (dashboard/inbox)
CREATE INDEX IF NOT EXISTS "conversations_company_status_updated_idx" ON "conversations"("company_id", "status", "updated_at");

-- Produtos por empresa, categoria e status (catálogo/filtros)
CREATE INDEX IF NOT EXISTS "products_company_category_status_idx" ON "products"("company_id", "category", "status");

-- Mensagens por conversa e data (histórico de chat)
CREATE INDEX IF NOT EXISTS "messages_conversation_created_idx" ON "messages"("conversation_id", "created_at");

-- Registros de pagamento por empresa e data (dashboard financeiro)
CREATE INDEX IF NOT EXISTS "payment_records_company_created_idx" ON "payment_records"("company_id", "created_at");
