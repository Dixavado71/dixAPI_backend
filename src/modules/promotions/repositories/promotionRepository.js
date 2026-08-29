import prisma from '../../../infrastructure/database/prismaClient.js';

const promotionData = (data) => ({
  name: data.name,
  description: data.description,
  type: data.type,
  value: data.value,
  minimum_amount: data.minimumAmount,
  starts_at: data.startsAt,
  ends_at: data.endsAt,
  usage_limit: data.usageLimit,
  rules: data.rules,
});

const couponData = (data) => ({
  promotion_id: data.promotionId,
  code: data.code,
  description: data.description,
  discount_type: data.discountType,
  discount_value: data.discountValue,
  minimum_amount: data.minimumAmount,
  max_discount: data.maxDiscount,
  usage_limit: data.usageLimit,
  per_customer_limit: data.perCustomerLimit,
  starts_at: data.startsAt,
  ends_at: data.endsAt,
});

export function listPromotions(companyId) { return prisma.promotion.findMany({ where: { company_id: companyId }, orderBy: { created_at: 'desc' }, include: { coupons: true } }); }
export function createPromotion(companyId, data) { return prisma.promotion.create({ data: { company_id: companyId, ...promotionData(data) } }); }
export function listCoupons(companyId) { return prisma.coupon.findMany({ where: { company_id: companyId }, orderBy: { code: 'asc' } }); }
export async function createCoupon(companyId, data) {
  const payload = couponData(data);
  if (payload.promotion_id) {
    const promotion = await prisma.promotion.findFirst({ where: { id: payload.promotion_id, company_id: companyId } });
    if (!promotion) return null;
  }
  return prisma.coupon.create({ data: { company_id: companyId, ...payload } });
}

export function getCustomization(companyId) { return prisma.companyCustomization.findUnique({ where: { company_id: companyId } }); }

function customizationData(data) {
  return {
    ...(data.brandName !== undefined ? { brand_name: data.brandName } : {}),
    ...(data.primaryColor !== undefined ? { primary_color: data.primaryColor } : {}),
    ...(data.secondaryColor !== undefined ? { secondary_color: data.secondaryColor } : {}),
    ...(data.logoUrl !== undefined ? { logo_url: data.logoUrl } : {}),
    ...(data.bannerUrl !== undefined ? { banner_url: data.bannerUrl } : {}),
    ...(data.faviconUrl !== undefined ? { favicon_url: data.faviconUrl } : {}),
    ...(data.websiteSlug !== undefined ? { website_slug: data.websiteSlug } : {}),
    ...(data.whatsappGreeting !== undefined ? { whatsapp_greeting: data.whatsappGreeting } : {}),
    ...(data.whatsappFallback !== undefined ? { whatsapp_fallback: data.whatsappFallback } : {}),
    ...(data.storefrontConfig !== undefined ? { storefront_config: data.storefrontConfig } : {}),
    ...(data.botConfig !== undefined ? { bot_config: data.botConfig } : {}),
  };
}

export function upsertCustomization(companyId, data) {
  const payload = customizationData(data);
  return prisma.companyCustomization.upsert({
    where: { company_id: companyId },
    create: { company_id: companyId, ...payload },
    update: payload,
  });
}
