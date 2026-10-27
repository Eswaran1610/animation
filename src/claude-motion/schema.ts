import {z} from "zod";

const Title = z.object({
  type: z.literal("title"),
  seconds: z.number().min(1.5).max(8),
  eyebrow: z.string().max(40).optional(),
  headline: z.string().max(80),
  sub: z.string().max(140).optional(),
});

const Terminal = z.object({
  type: z.literal("terminal"),
  seconds: z.number().min(2).max(12),
  lines: z.array(z.object({
    kind: z.enum(["cmd", "out"]),
    text: z.string().max(70),
  })).min(1).max(8),
});

const Diagram = z.object({
  type: z.literal("diagram"),
  seconds: z.number().min(3).max(10),
  caption: z.string().max(80).optional(),
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string().max(18),
    x: z.number().min(8).max(92), // percent of width
    y: z.number().min(12).max(88), // percent of height
  })).min(2).max(6),
  edges: z.array(z.tuple([z.string(), z.string()])).min(1).max(8),
});

export const Scene = z.discriminatedUnion("type", [Title, Terminal, Diagram]);
export const Campaign = z.object({
  name: z.string().regex(/^[a-z0-9_-]+$/),
  fps: z.number().default(30),
  scenes: z.array(Scene).min(1).max(7),
});
export type TCampaign = z.infer<typeof Campaign>;
export type TScene = z.infer<typeof Scene>;
