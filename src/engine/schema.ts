import { z } from "zod";

// Strict list of supported scene visual archetypes
export const SupportedSceneTypes = [
  "kinetic_hook",        // Word-by-word kinetic headline with category pill and visual callout
  "terminal_code",       // macOS window with live simulated typing, syntax stream & status pill
  "network_topology",   // Interactive multi-tier architecture diagram with live packet animation
  "before_after_split",  // Side-by-side / vertical Before vs After comparison screen
  "feature_cards",       // Frosted-glass staggered feature checklist with status pills
  "metric_counter",      // Real-time counter (0 -> N%) with SVG gauge ring & dual comparison cards
  "conversion_cta",      // Pulsing Apple/Vercel-style pill button with brand badge & assurance pill
] as const;

export const FeatureCardItemSchema = z.union([
  z.string(),
  z.object({
    title: z.string(),
    description: z.string().optional(),
    badge: z.string().optional(),
  }),
]);

export const MotionSceneSchema = z.object({
  id: z.string(),
  type: z.enum(SupportedSceneTypes),
  tag: z.string().default("ENTERPRISE ARCHITECTURE"),
  headline: z.string().min(1),
  accentWord: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  
  // Terminal specific props (for 'terminal_code')
  terminalCommand: z.string().optional(),
  terminalOutput: z.string().optional(),
  terminalAlert: z.string().optional(),
  terminalTitle: z.string().optional().default("bash — auth_policy.sh"),
  terminalCodeLines: z.array(z.string()).optional(),

  // Before vs After specific props (for 'before_after_split')
  beforeAfter: z.object({
    beforeTitle: z.string().default("Legacy Approach"),
    beforeItems: z.array(z.string()).default(["Slow Manual Execution", "High Regression Risk", "Opaque Observability"]),
    afterTitle: z.string().default("Modern Automated Architecture"),
    afterItems: z.array(z.string()).default(["Instant Code-Driven Flow", "Deterministic Verification", "Real-Time Telemetry"]),
  }).optional(),

  // Feature cards specific props (for 'feature_cards')
  items: z.array(FeatureCardItemSchema).optional(),

  // Topology specific props (for 'network_topology')
  nodeLeft: z.object({ 
    icon: z.string().optional().default("user"), 
    label: z.string(), 
    status: z.string(),
    sub: z.string().optional(),
  }).optional(),
  nodeCenter: z.object({ 
    icon: z.string().optional().default("shield"), 
    label: z.string(), 
    sub: z.string(),
    status: z.string().optional().default("ACTIVE"),
  }).optional(),
  nodeRight: z.object({ 
    icon: z.string().optional().default("lock"), 
    label: z.string(), 
    sub: z.string(),
    status: z.string().optional().default("ISOLATED"),
  }).optional(),
  topologyRules: z.array(z.string()).optional(),

  // Metrics specific props (for 'metric_counter')
  metricTarget: z.number().optional().default(95),
  metricSuffix: z.string().optional().default("%"),
  metricLabel: z.string().optional().default("Attack Surface Removed"),
  secondaryMetricValue: z.string().optional().default("0ms"),
  secondaryMetricLabel: z.string().optional().default("Lateral Traversal"),
  comparisonBefore: z.string().optional(),
  comparisonAfter: z.string().optional(),

  // CTA specific props (for 'conversion_cta')
  ctaHeadline: z.string().optional(),
  ctaSubtext: z.string().optional(),
  trustBadges: z.array(z.string()).optional(),

  // Scene timing (seconds)
  durationSeconds: z.number().min(2).max(30).default(5),
});

export const CampaignDataSchema = z.object({
  campaignId: z.string().regex(/^[a-zA-Z0-9_-]+$/, "campaignId must be alphanumeric with dashes/underscores"),
  title: z.string(),
  brand: z.object({
    name: z.string(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be valid 6-char hex color"),
    accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be valid 6-char hex color"),
    backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#030712"),
    theme: z.enum(["cyber", "claude", "fintech", "indigo"]).default("cyber").optional(),
  }),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("9:16"),
  ctaText: z.string().default("Get Started Today →"),
  audioTrack: z.string().default("cyber_audio.wav"),
  scenes: z.array(MotionSceneSchema).min(1),
});

export type MotionScene = z.infer<typeof MotionSceneSchema>;
export type CampaignData = z.infer<typeof CampaignDataSchema>;
