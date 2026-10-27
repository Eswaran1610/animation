import { z } from "zod";

export const CampaignSchema = z.object({
  id: z.string(),
  brand: z.object({
    name: z.string(),
    tagline: z.string(),
    primaryColor: z.string().default("#3B82F6"),
    secondaryColor: z.string().default("#1E293B"),
    accentColor: z.string().default("#10B981"),
    bgColor: z.string().default("#0B0F19"),
    textColor: z.string().default("#F8FAFC"),
  }),
  metrics: z.object({
    metricValue: z.string(),
    metricLabel: z.string(),
  }),
  features: z.array(z.string()).min(2),
  hookText: z.string().max(300),
  ctaText: z.string().max(80),
  ctaSubtext: z.string().max(120),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
});

export type CampaignConfig = z.infer<typeof CampaignSchema>;
