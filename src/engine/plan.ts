import { z } from "zod";
import { CampaignDataSchema, type CampaignData, type MotionScene } from "./schema";

/**
 * The only format an AI director may create.  Rendering code consumes this
 * contract; an agent never needs to know about React components or timings.
 */
export const PlanSceneTypes = [
  "kinetic_hook",
  "typing_terminal",
  "code_diff",
  "card_reveal",
  "stat_counter",
  "quote",
  "list_build",
  "before_after",
  "network_topology",
  "cta",
] as const;

export type PlanSceneType = (typeof PlanSceneTypes)[number];

/** Human- and agent-readable capability list; it deliberately contains no UI code. */
export const SceneCatalog = [
  { type: "kinetic_hook", label: "Kinetic hook", purpose: "Open with a concise, high-impact claim.", requiredContent: ["headline"], suggestedDuration: [3, 5] },
  { type: "typing_terminal", label: "Typing terminal", purpose: "Show a command and its live output.", requiredContent: ["headline", "command", "output"], suggestedDuration: [4, 7] },
  { type: "code_diff", label: "Code diff", purpose: "Contrast a risky or old snippet with its improved replacement.", requiredContent: ["headline", "before", "after"], suggestedDuration: [4, 7] },
  { type: "card_reveal", label: "Card reveal", purpose: "Reveal 2–4 product features or benefits.", requiredContent: ["headline", "items"], suggestedDuration: [4, 6] },
  { type: "stat_counter", label: "Stat counter", purpose: "Land a measurable result with a counter or gauge.", requiredContent: ["headline", "value", "label"], suggestedDuration: [3, 5] },
  { type: "quote", label: "Quote", purpose: "Present a customer statement or concise proof point.", requiredContent: ["quote"], suggestedDuration: [3, 5] },
  { type: "list_build", label: "List build", purpose: "Build a short checklist or process step-by-step.", requiredContent: ["headline", "items"], suggestedDuration: [4, 6] },
  { type: "before_after", label: "Before / after", purpose: "Compare an old state to an improved state.", requiredContent: ["headline", "before", "after"], suggestedDuration: [4, 7] },
  { type: "network_topology", label: "Network topology", purpose: "Show an identity, policy, and workload relationship.", requiredContent: ["headline", "nodes"], suggestedDuration: [4, 7] },
  { type: "cta", label: "Call to action", purpose: "Close with one clear next step.", requiredContent: ["headline", "cta"], suggestedDuration: [3, 5] },
] as const satisfies ReadonlyArray<{
  type: PlanSceneType;
  label: string;
  purpose: string;
  requiredContent: readonly string[];
  suggestedDuration: readonly [number, number];
}>;

const HexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a 6-character hex color");

export const PlanSchema = z.object({
  meta: z.object({
    fps: z.literal(30),
    size: z.object({ width: z.literal(1080), height: z.literal(1920) }),
    mood: z.string().min(1).max(60),
    styleSeed: z.string().min(1).max(128),
  }),
  theme: z.object({
    palette: z.object({
      background: HexColor,
      foreground: HexColor,
      primary: HexColor,
      accent: HexColor,
      muted: HexColor,
    }),
    fonts: z.object({ heading: z.string().min(1), body: z.string().min(1), mono: z.string().min(1) }),
    easing: z.enum(["calm", "snappy", "cinematic"]),
    motionIntensity: z.enum(["low", "medium", "high"]),
    background: z.enum(["aurora", "grid", "paper", "gradient", "noise"]),
  }),
  scenes: z.array(z.object({
    id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
    type: z.enum(PlanSceneTypes),
    start: z.number().min(0),
    dur: z.number().min(2).max(30),
    content: z.object({
      headline: z.string().max(100).optional(),
      eyebrow: z.string().max(50).optional(),
      body: z.string().max(280).optional(),
      items: z.array(z.string().max(100)).max(6).optional(),
      quote: z.string().max(280).optional(),
      attribution: z.string().max(100).optional(),
      value: z.string().max(24).optional(),
      label: z.string().max(80).optional(),
      command: z.string().max(160).optional(),
      output: z.string().max(280).optional(),
      before: z.union([z.string().max(280), z.array(z.string().max(100)).max(6)]).optional(),
      after: z.union([z.string().max(280), z.array(z.string().max(100)).max(6)]).optional(),
      cta: z.string().max(80).optional(),
      nodes: z.array(z.object({ id: z.string().max(40), label: z.string().max(80) })).max(6).optional(),
    }).passthrough(),
    params: z.record(z.string(), z.unknown()).default({}),
  })).min(1).max(12).superRefine((scenes, ctx) => {
    const ids = new Set<string>();
    let lastStart = -1;
    for (const [index, scene] of scenes.entries()) {
      if (ids.has(scene.id)) ctx.addIssue({ code: "custom", path: [index, "id"], message: "Scene ids must be unique" });
      ids.add(scene.id);
      if (scene.start < lastStart) ctx.addIssue({ code: "custom", path: [index, "start"], message: "Scenes must be ordered by start time" });
      lastStart = scene.start;
    }
  }),
  audio: z.object({
    bed: z.object({
      mood: z.string().min(1).max(60),
      bpm: z.number().int().min(50).max(200),
      // Optional generated/selected file. The agent chooses mood and bpm;
      // the audio stage owns selecting or generating this asset.
      asset: z.string().min(1).max(240).optional(),
    }),
    sfxCues: z.array(z.object({ at: z.number().min(0), sound: z.string().min(1).max(60), gainDb: z.number().min(-30).max(6).optional() })).max(40).default([]),
  }),
}).strict();

export type MotionPlan = z.infer<typeof PlanSchema>;

/** JSON Schema passed directly to `codex exec --output-schema` in Step 3. */
export const MotionPlanJsonSchema = z.toJSONSchema(PlanSchema);

const legacySceneType: Record<MotionScene["type"], PlanSceneType> = {
  kinetic_hook: "kinetic_hook",
  terminal_code: "typing_terminal",
  code_terminal: "typing_terminal",
  network_topology: "network_topology",
  before_after_split: "before_after",
  feature_cards: "card_reveal",
  metric_counter: "stat_counter",
  conversion_cta: "cta",
};

/**
 * Compatibility boundary for existing engine campaign files. Step 2 will use
 * this rather than requiring users to rewrite anything under campaigns/.
 */
export const campaignToMotionPlan = (campaign: CampaignData): MotionPlan => {
  let start = 0;
  const scenes = campaign.scenes.map((scene, index) => {
    const dur = scene.durationSeconds ?? 5;
    const legacyFields = { ...scene } as Record<string, unknown>;
    const content = {
      headline: scene.headline,
      eyebrow: scene.tag,
      body: scene.subtitle ?? scene.description,
      command: scene.terminalCommand,
      output: scene.terminalOutput,
      value: scene.metricTarget === undefined ? undefined : `${scene.metricTarget}${scene.metricSuffix ?? ""}`,
      label: scene.metricLabel,
      cta: scene.ctaHeadline,
      items: scene.items?.map((item) => typeof item === "string" ? item : item.title),
    };
    const converted = { id: scene.id || `scene_${index + 1}`, type: legacySceneType[scene.type], start, dur, content, params: legacyFields } as MotionPlan["scenes"][number];
    start += dur;
    return converted;
  });

  return PlanSchema.parse({
    meta: { fps: 30, size: { width: 1080, height: 1920 }, mood: campaign.brand.theme ?? "cinematic", styleSeed: campaign.campaignId },
    theme: {
      palette: { background: campaign.brand.backgroundColor ?? "#030712", foreground: "#FFFFFF", primary: campaign.brand.primaryColor, accent: campaign.brand.accentColor, muted: "#94A3B8" },
      fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", mono: "monospace" },
      easing: "cinematic",
      motionIntensity: "medium",
      background: campaign.brand.theme === "claude" ? "paper" : "aurora",
    },
    scenes,
    audio: { bed: { mood: campaign.brand.theme ?? "cinematic", bpm: 100, asset: campaign.audioTrack || undefined }, sfxCues: [] },
  });
};

const planSceneToLegacyType: Record<PlanSceneType, MotionScene["type"]> = {
  kinetic_hook: "kinetic_hook",
  typing_terminal: "terminal_code",
  code_diff: "before_after_split",
  card_reveal: "feature_cards",
  stat_counter: "metric_counter",
  quote: "kinetic_hook",
  list_build: "feature_cards",
  before_after: "before_after_split",
  network_topology: "network_topology",
  cta: "conversion_cta",
};

const asItems = (value: string | string[] | undefined): string[] | undefined =>
  Array.isArray(value) ? value : value ? [value] : undefined;

/**
 * Temporary presentation adapter for the existing scene components. The
 * universal engine receives a MotionPlan first; this adapter lets it reuse
 * established visual components while new scene implementations land.
 */
export const motionPlanToCampaign = (planInput: MotionPlan): CampaignData => {
  const plan = PlanSchema.parse(planInput);
  const primaryLower = plan.theme.palette.primary.toLowerCase();
  const moodLower = plan.meta.mood.toLowerCase();
  const isClaude = primaryLower === "#d97757" || moodLower.includes("claude") || (plan.theme.fonts?.heading && plan.theme.fonts.heading.toLowerCase().includes("georgia"));
  const theme = isClaude ? "claude" :
    primaryLower === "#10b981" ? "cyber" :
    primaryLower === "#f59e0b" ? "fintech" : "indigo";

  const scenes = plan.scenes.map((scene) => {
    const preserved = scene.params as Partial<MotionScene>;
    const beforeItems = asItems(scene.content.before);
    const afterItems = asItems(scene.content.after);
    const metricTarget = Number.parseFloat(scene.content.value?.replace(/[^0-9.]/g, "") ?? "");
    const headlineText = scene.content.headline ?? scene.content.quote ?? preserved.headline ?? "Autonomous Execution";
    const words = headlineText.split(" ");
    const accentWord = preserved.accentWord ?? (words.length > 2 ? words.slice(1, 3).join(" ") : words[0]);

    return {
      ...preserved,
      id: scene.id,
      type: planSceneToLegacyType[scene.type],
      tag: scene.content.eyebrow ?? preserved.tag ?? (isClaude ? "CLAUDE CODE" : "SYSTEM EXECUTION"),
      headline: headlineText,
      accentWord,
      subtitle: scene.content.body ?? preserved.subtitle ?? (isClaude ? "Autonomous engineering with code-level precision." : "Engineered for maximum velocity."),
      terminalTitle: isClaude ? "claude — interactive session" : (preserved.terminalTitle ?? "terminal — zsh"),
      terminalCommand: scene.content.command ?? preserved.terminalCommand ?? "claude review --strict --branch=main",
      terminalOutput: scene.content.output ?? preserved.terminalOutput ?? "✔ Parsed AST. All verification passes.",
      terminalAlert: preserved.terminalAlert ?? "VERIFIED: Zero Regressions Detected",
      items: scene.content.items?.map((title) => ({ title })) ?? preserved.items ?? [
        { title: "Autonomous Refactoring" },
        { title: "Type-Safe Guarantee" },
        { title: "Sub-Second Execution" }
      ],
      beforeAfter: beforeItems || afterItems ? {
        beforeTitle: isClaude ? "Legacy Manual Workflow" : "Legacy Approach",
        beforeItems: beforeItems ?? ["Fragile manual edits", "Blindspot regressions"],
        afterTitle: isClaude ? "Claude Code Autonomy" : "Automated Modern Engine",
        afterItems: afterItems ?? ["Deterministic code-driven changes", "Continuous AST verification"],
      } : preserved.beforeAfter,
      metricTarget: Number.isFinite(metricTarget) ? metricTarget : preserved.metricTarget ?? 98,
      metricSuffix: scene.content.value?.match(/[%a-zA-Z]+$/)?.[0] ?? preserved.metricSuffix ?? "%",
      metricLabel: scene.content.label ?? preserved.metricLabel ?? "Cycle Time Reduction",
      ctaHeadline: scene.content.cta ?? preserved.ctaHeadline ?? "Experience Claude Code →",
      trustBadges: isClaude ? ["CLAUDE-POWERED", "ZERO RETENTION", "LOCAL CLI AUTONOMY"] : ["SOC-2 AUDITED", "ZERO OVERHEAD", "DEPLOYS IN 5 MIN"],
      durationSeconds: scene.dur,
    } as MotionScene;
  });

  return CampaignDataSchema.parse({
    campaignId: `plan_${plan.meta.styleSeed.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "render"}`,
    title: plan.meta.mood,
    brand: {
      name: isClaude ? "Claude Code" : "Motion Studio",
      primaryColor: plan.theme.palette.primary,
      accentColor: plan.theme.palette.accent,
      backgroundColor: plan.theme.palette.background,
      theme,
    },
    aspectRatio: "9:16",
    ctaText: isClaude ? "Get Started with Claude Code →" : "Learn more →",
    audioTrack: plan.audio.bed.asset ?? "",
    scenes,
  });
};
