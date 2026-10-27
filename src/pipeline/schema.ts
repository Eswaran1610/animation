import { z } from "zod";

export const BriefSchema = z.object({
  topic: z.string().min(1),
  angle: z.string().min(1),
  audience: z.string().min(1),
  format: z.string().min(1),
  durationSeconds: z.number().min(5).max(300),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
  language: z.string().default("English"),
  tone: z.string().default("calm and clear"),
});

export type Brief = z.infer<typeof BriefSchema>;

export const ResearchSourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  publisher: z.string().optional(),
  publicationDate: z.string().optional(),
  retrievedAt: z.string().min(1),
  supportsClaims: z.array(z.string()).default([]),
});

export const ClaimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  sources: z.array(z.string()).min(1),
  date: z.string().optional(),
  confidence: z.enum(["high", "medium", "low", "single_source"]),
  type: z.enum(["context", "mechanism", "impact", "indicator", "fix", "timeline", "other"]),
});

export const ResearchStatSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.union([z.string(), z.number()]),
  source: z.string().min(1),
});

export const TimelineEventSchema = z.object({
  date: z.string().min(1),
  event: z.string().min(1),
  source: z.string().min(1),
});

export const ResearchFixSchema = z.object({
  id: z.string().min(1),
  step: z.string().min(1),
  source: z.string().min(1),
  claimIds: z.array(z.string()).default([]),
});

export const ResearchArtifactSchema = z.object({
  generatedAt: z.string().min(1),
  queries: z.array(z.string()).min(1),
  summary: z.string().default(""),
  sources: z.array(ResearchSourceSchema),
  claims: z.array(ClaimSchema),
  stats: z.array(ResearchStatSchema).default([]),
  timeline: z.array(TimelineEventSchema).default([]),
  fixes: z.array(ResearchFixSchema).default([]),
});

export type ResearchSource = z.infer<typeof ResearchSourceSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type ResearchArtifact = z.infer<typeof ResearchArtifactSchema>;

export const ScriptBeatSchema = z.enum(["hook", "context", "mechanism", "impact", "detect_fix", "cta"]);
export type ScriptBeat = z.infer<typeof ScriptBeatSchema>;

export const ScriptLineSchema = z.object({
  id: z.string().min(1),
  beat: ScriptBeatSchema,
  text: z.string().min(1).max(240),
  claimIds: z.array(z.string()).default([]),
  emphasis: z.array(z.string()).max(3).default([]),
});

export const ScriptArtifactSchema = z.object({
  videoTitle: z.string().min(1),
  targetAudience: z.string().min(1),
  targetDurationSeconds: z.number().min(5).max(300),
  lines: z.array(ScriptLineSchema).min(2),
  narrationScript: z.string().min(1),
});

export type ScriptLine = z.infer<typeof ScriptLineSchema>;
export type ScriptArtifact = z.infer<typeof ScriptArtifactSchema>;

export const DirectorSceneTypeSchema = z.enum([
  "kinetic_title",
  "stat_counter",
  "flow_diagram",
  "code_reveal",
  "terminal",
  "timeline",
  "compare_split",
  "checklist",
  "file_tree",
  "quote_card",
  "cta_end",
]);

export type DirectorSceneType = z.infer<typeof DirectorSceneTypeSchema>;

export const SceneSpecSchema = z.object({
  id: z.string().min(1),
  type: DirectorSceneTypeSchema,
  beat: ScriptBeatSchema,
  voice: z.string().min(1),
  props: z.record(z.string(), z.unknown()).default({}),
  claimIds: z.array(z.string()).default([]),
  transitionOut: z.enum(["push_up", "push_left", "fade", "wipe", "zoom"]).default("fade"),
  durationSeconds: z.number().min(2.5).max(6),
});

export const ScenesArtifactSchema = z.object({
  meta: z.object({
    fps: z.number().int().min(1).max(120),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    theme: z.string().min(1),
  }),
  scenes: z.array(SceneSpecSchema).min(2),
});

export type SceneSpec = z.infer<typeof SceneSpecSchema>;
export type ScenesArtifact = z.infer<typeof ScenesArtifactSchema>;

export const WordTimingSchema = z.object({
  word: z.string().min(1),
  startSeconds: z.number().nonnegative(),
  endSeconds: z.number().positive(),
  sceneId: z.string().min(1),
});

export const TimingArtifactSchema = z.object({
  method: z.enum(["tts_word_timestamps", "reading_speed_estimate"]),
  fps: z.number().int().min(1).max(120),
  totalDurationSeconds: z.number().positive(),
  words: z.array(WordTimingSchema),
  scenes: z.array(z.object({
    sceneId: z.string(),
    startSeconds: z.number().nonnegative(),
    endSeconds: z.number().positive(),
    startFrame: z.number().int().nonnegative(),
    endFrame: z.number().int().positive(),
  })),
});

export type TimingArtifact = z.infer<typeof TimingArtifactSchema>;

export const QACheckSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

export const QAReportSchema = z.object({
  generatedAt: z.string(),
  passed: z.boolean(),
  checks: z.array(QACheckSchema),
});

export type QAReport = z.infer<typeof QAReportSchema>;
