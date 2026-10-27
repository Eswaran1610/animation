import { z } from "zod";

export const ScriptSceneSchema = z.object({
  id: z.string(),
  type: z.enum(["hook", "problem", "solution", "stats", "cta"]),
  tag: z.string().default("FEATURE HIGHLIGHT"),
  headline: z.string(),
  accentWord: z.string().optional(),
  description: z.string().optional(),
  items: z.array(z.string()).optional(),
  statNumber: z.string().optional(),
  statLabel: z.string().optional(),
  durationSeconds: z.number().default(5),
});

export const MasterScriptPlanSchema = z.object({
  title: z.string(),
  brand: z.object({
    name: z.string(),
    primaryColor: z.string().default("#10B981"),
    accentColor: z.string().default("#06B6D4"),
    backgroundColor: z.string().default("#030712"),
  }),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("9:16"),
  ctaText: z.string().default("Get Started Free →"),
  scenes: z.array(ScriptSceneSchema).min(1),
});

export type ScriptScene = z.infer<typeof ScriptSceneSchema>;
export type MasterScriptPlan = z.infer<typeof MasterScriptPlanSchema>;
