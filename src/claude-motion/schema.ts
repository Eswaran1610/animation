import {z} from "zod";

export const Audio = z.object({
  music: z.string().optional(), // file in public/ or https URL, e.g. "claude_audio.wav"
  musicVolume: z.number().min(0).max(1).default(0.35),
  sfx: z.boolean().default(true),
});

export const Img = z.object({
  src: z.string(), // "stickers/rocket.svg" or public file / https URL
  x: z.number().default(50), // percent of width
  y: z.number().default(50), // percent of height
  size: z.number().default(30), // percent of width
  anim: z.enum(["fade", "pop", "float", "slide"]).default("float"),
});

const Title = z.object({
  type: z.literal("title"),
  seconds: z.number().min(1.5).max(10),
  eyebrow: z.string().max(60).optional(),
  headline: z.string().max(100),
  sub: z.string().max(160).optional(),
  image: Img.optional(),
  sfx: z.string().optional(),
});

const Terminal = z.object({
  type: z.literal("terminal"),
  seconds: z.number().min(2).max(15),
  eyebrow: z.string().max(60).optional(),
  lines: z.array(z.object({
    kind: z.enum(["cmd", "out"]),
    text: z.string().max(90),
  })).min(1).max(10),
  image: Img.optional(),
  sfx: z.string().optional(),
});

const Diagram = z.object({
  type: z.literal("diagram"),
  seconds: z.number().min(2).max(12),
  eyebrow: z.string().max(60).optional(),
  caption: z.string().max(100).optional(),
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string().max(24),
    x: z.number().min(5).max(95), // percent of width
    y: z.number().min(10).max(90), // percent of height
  })).min(2).max(8),
  edges: z.array(z.tuple([z.string(), z.string()])).min(1).max(10),
  image: Img.optional(),
  sfx: z.string().optional(),
});

const Stat = z.object({
  type: z.literal("stat"),
  seconds: z.number().min(1.5).max(10),
  eyebrow: z.string().max(60).optional(),
  value: z.string().max(24), // e.g. "99.99%", "10x", "$2.4M"
  label: z.string().max(100),
  sub: z.string().max(160).optional(),
  image: Img.optional(),
  sfx: z.string().optional(),
});

const BeforeAfter = z.object({
  type: z.literal("before_after"),
  seconds: z.number().min(2).max(12),
  eyebrow: z.string().max(60).optional(),
  headline: z.string().max(100).optional(),
  beforeTitle: z.string().default("Before"),
  beforeItems: z.array(z.string().max(80)).min(1).max(5),
  afterTitle: z.string().default("After"),
  afterItems: z.array(z.string().max(80)).min(1).max(5),
  image: Img.optional(),
  sfx: z.string().optional(),
});

const List = z.object({
  type: z.literal("list"),
  seconds: z.number().min(2).max(12),
  eyebrow: z.string().max(60).optional(),
  headline: z.string().max(100),
  items: z.array(z.string().max(90)).min(2).max(6),
  image: Img.optional(),
  sfx: z.string().optional(),
});

const Quote = z.object({
  type: z.literal("quote"),
  seconds: z.number().min(2).max(10),
  eyebrow: z.string().max(60).optional(),
  quote: z.string().max(180),
  author: z.string().max(60),
  role: z.string().max(80).optional(),
  image: Img.optional(),
  sfx: z.string().optional(),
});

const Cta = z.object({
  type: z.literal("cta"),
  seconds: z.number().min(2).max(10),
  eyebrow: z.string().max(60).optional(),
  headline: z.string().max(100),
  sub: z.string().max(160).optional(),
  buttonText: z.string().max(50).default("Get Started →"),
  image: Img.optional(),
  sfx: z.string().optional(),
});

export const Scene = z.discriminatedUnion("type", [
  Title,
  Terminal,
  Diagram,
  Stat,
  BeforeAfter,
  List,
  Quote,
  Cta,
]);

export const Theme = z.object({
  bg: z.string().optional(),
  panel: z.string().optional(),
  clay: z.string().optional(),
  cream: z.string().optional(),
  muted: z.string().optional(),
});

export const Campaign = z.object({
  name: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  fps: z.number().default(30),
  size: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
  theme: Theme.optional(),
  audio: Audio.default({ musicVolume: 0.35, sfx: true }),
  scenes: z.array(Scene).min(1).max(12),
});

export type TCampaign = z.infer<typeof Campaign>;
export type TScene = z.infer<typeof Scene>;
export type TImg = z.infer<typeof Img>;
export type TAudio = z.infer<typeof Audio>;
