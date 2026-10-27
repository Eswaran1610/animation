import { Brief, BriefSchema } from "./schema";

const labels = ["topic", "angle", "audience", "format"] as const;

function parseFormat(format: string) {
  const durationMatch = format.match(/(\d+(?:\.\d+)?)\s*s/i);
  const ratioMatch = format.match(/(9:16|16:9|1:1)/);
  const language = format.match(/\b(English|Hindi|Tamil|Spanish|French)\b/i)?.[1] || "English";
  const tone = format.match(/(?:tone|style)\s*[:=]?\s*([^,]+)/i)?.[1]?.trim() || "calm and clear";
  return {
    durationSeconds: durationMatch ? Number(durationMatch[1]) : 60,
    aspectRatio: (ratioMatch?.[1] || "9:16") as Brief["aspectRatio"],
    language,
    tone,
  };
}

export function parseBrief(input: string | Brief): Brief {
  if (typeof input !== "string") return BriefSchema.parse(input);

  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const values: Record<string, string> = {};
  for (const line of lines) {
    const match = line.match(/^\s*(topic|angle|audience|format)\s*:\s*(.+)$/i);
    if (match) values[match[1].toLowerCase()] = match[2].trim();
  }

  if (!values.topic && lines.length >= 4 && !lines.some((line) => line.includes(":"))) {
    labels.forEach((label, index) => { values[label] = lines[index]; });
  }

  if (!values.topic || !values.angle || !values.audience || !values.format) {
    throw new Error("Brief must contain topic, angle, audience, and format lines.");
  }

  return BriefSchema.parse({ ...values, ...parseFormat(values.format) });
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "motion-video";
}
