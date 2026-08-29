-- Adiciona vínculo opcional de fluxo de automação por número WhatsApp
ALTER TABLE "whatsapp_numbers" ADD COLUMN "flow_id" UUID;
