import { z } from 'zod';

export const customizationSchema = z.object({
  brandName: z.string().trim().max(120).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  logoUrl: z.string().url().max(2048).optional(),
  bannerUrl: z.string().url().max(2048).optional(),
  faviconUrl: z.string().url().max(2048).optional(),
  websiteSlug: z.string().trim().min(3).max(80).regex(/^[a-z0-9-]+$/).optional(),
  whatsappGreeting: z.string().max(500).optional(),
  whatsappFallback: z.string().max(500).optional(),
  storefrontConfig: z.record(z.unknown()).optional(),
  botConfig: z.record(z.unknown()).optional(),
}).strict().refine(data => Object.keys(data).length > 0, { message: 'At least one customization field must be provided' });
