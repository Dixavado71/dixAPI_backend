-- Adiciona remote_jid e reactions ao WhatsAppMessage para permitir
-- filtro por chat e cache/histórico das mensagens buscadas da Evolution API.

BEGIN;

ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS remote_jid VARCHAR;
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS reactions JSONB;

CREATE INDEX IF NOT EXISTS "whatsapp_messages_company_id_whatsapp_number_id_remote_jid_sent_at_idx"
  ON whatsapp_messages (company_id, whatsapp_number_id, remote_jid, sent_at);

COMMIT;
