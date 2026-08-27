-- Índices de dashboard/auditoria
-- Conversas: agrupamento por canal e contagem por status dentro do tenant
CREATE INDEX IF NOT EXISTS "conversations_company_id_channel_idx" ON conversations (company_id, channel);
CREATE INDEX IF NOT EXISTS "conversations_company_id_status_idx" ON conversations (company_id, status);
-- Clientes: contagem de ativos por tenant no dashboard
CREATE INDEX IF NOT EXISTS "customers_company_id_status_idx" ON customers (company_id, status);
