import * as repository from '../../../modules/promotions/repositories/promotionRepository.js';

function mapCustomization(c) {
  if (!c) return c;
  return {
    id: c.id,
    companyId: c.company_id,
    brandName: c.brand_name,
    primaryColor: c.primary_color,
    secondaryColor: c.secondary_color,
    logoUrl: c.logo_url,
    bannerUrl: c.banner_url,
    faviconUrl: c.favicon_url,
    websiteSlug: c.website_slug,
    whatsappGreeting: c.whatsapp_greeting,
    whatsappFallback: c.whatsapp_fallback,
    storefrontConfig: c.storefront_config,
    botConfig: c.bot_config,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

export const getCustomization = async (companyId) => mapCustomization(await repository.getCustomization(companyId));
export const updateCustomization = async (companyId, data) => mapCustomization(await repository.upsertCustomization(companyId, data));
