import type { MotionPlan, PlanSceneType } from "./plan";

export type SfxCategory = "whoosh" | "click" | "impact";

type SfxVariant = {
  src: string;
  volume: number;
  playbackRate: number;
};

export type TimedSfxCue = SfxVariant & {
  id: string;
  at: number;
  category: SfxCategory;
  automatic: boolean;
};

// Variants are deterministic playback treatments of the licensed local pack.
// New source files can be appended here without changing plan or engine code.
export const SfxPacks: Record<SfxCategory, readonly SfxVariant[]> = {
  whoosh: [
    { src: "sfx/whoosh.wav", volume: 0.30, playbackRate: 0.90 },
    { src: "sfx/whoosh.wav", volume: 0.28, playbackRate: 1.00 },
    { src: "sfx/whoosh.wav", volume: 0.26, playbackRate: 1.12 },
  ],
  click: [
    { src: "sfx/click.wav", volume: 0.26, playbackRate: 0.86 },
    { src: "sfx/click.wav", volume: 0.24, playbackRate: 1.00 },
    { src: "sfx/click.wav", volume: 0.22, playbackRate: 1.16 },
  ],
  impact: [
    { src: "sfx/impact.wav", volume: 0.42, playbackRate: 0.88 },
    { src: "sfx/impact.wav", volume: 0.38, playbackRate: 1.00 },
    { src: "sfx/impact.wav", volume: 0.34, playbackRate: 1.10 },
  ],
};

const hash = (value: string) => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index++) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
};

const chooseVariant = (category: SfxCategory, styleSeed: string, id: string): SfxVariant => {
  const pack = SfxPacks[category];
  return pack[hash(`${styleSeed}:${id}`) % pack.length];
};

const cue = (styleSeed: string, id: string, at: number, category: SfxCategory, automatic: boolean): TimedSfxCue => ({
  id,
  at: Math.max(0, at),
  category,
  automatic,
  ...chooseVariant(category, styleSeed, id),
});

const sceneCues: Record<PlanSceneType, (scene: MotionPlan["scenes"][number]) => Array<[number, SfxCategory]>> = {
  kinetic_hook: () => [[0.12, "whoosh"], [0.55, "impact"]],
  typing_terminal: (scene) => {
    const textLength = scene.content.command?.length ?? 24;
    const ticks = Math.min(10, Math.max(3, Math.ceil(textLength / 18)));
    return [[0.10, "whoosh"], ...Array.from({ length: ticks }, (_, index) => [0.55 + index * 0.18, "click"] as [number, SfxCategory])];
  },
  code_diff: () => [[0.12, "whoosh"], [0.75, "click"], [1.55, "impact"]],
  card_reveal: (scene) => [[0.10, "whoosh"], ...(scene.content.items ?? []).slice(0, 4).map((_, index) => [0.65 + index * 0.38, "click"] as [number, SfxCategory])],
  stat_counter: () => [[0.12, "whoosh"], [1.35, "impact"]],
  quote: () => [[0.18, "whoosh"], [0.72, "click"]],
  list_build: (scene) => [[0.10, "whoosh"], ...(scene.content.items ?? []).slice(0, 5).map((_, index) => [0.58 + index * 0.34, "click"] as [number, SfxCategory])],
  before_after: () => [[0.10, "whoosh"], [0.78, "click"], [1.48, "impact"]],
  network_topology: () => [[0.10, "whoosh"], [0.75, "click"], [1.45, "click"]],
  cta: () => [[0.15, "whoosh"], [1.05, "click"]],
};

const cueCategory = (sound: string): SfxCategory => {
  const normalized = sound.toLowerCase();
  if (normalized.includes("impact") || normalized.includes("hit")) return "impact";
  if (normalized.includes("click") || normalized.includes("tick") || normalized.includes("pop")) return "click";
  return "whoosh";
};

/** Derives normal movement SFX from the same plan timings the engine renders. */
export const buildSfxCues = (plan: MotionPlan): TimedSfxCue[] => {
  const automatic = plan.scenes.flatMap((scene) =>
    sceneCues[scene.type](scene)
      .filter(([offset]) => offset < scene.dur)
      .map(([offset, category], index) => cue(plan.meta.styleSeed, `${scene.id}:auto:${index}`, scene.start + offset, category, true)),
  );
  const exceptions = plan.audio.sfxCues.map((exception, index) => {
    const category = cueCategory(exception.sound);
    const selected = cue(plan.meta.styleSeed, `exception:${index}:${exception.sound}`, exception.at, category, false);
    return { ...selected, volume: exception.gainDb === undefined ? selected.volume : Math.max(0, selected.volume * Math.pow(10, exception.gainDb / 20)) };
  });

  return [...automatic, ...exceptions].sort((left, right) => left.at - right.at);
};

/** Keeps the music bed about 6dB lower around an SFX transient. */
export const musicDuckMultiplier = (frame: number, fps: number, cues: TimedSfxCue[]) =>
  cues.reduce((lowest, current) => {
    const offset = frame - current.at * fps;
    if (offset < -2 || offset > 18) return lowest;
    const multiplier = offset < 0
      ? 1 - 0.5 * ((offset + 2) / 2)
      : offset < 8
        ? 0.5
        : 0.5 + 0.5 * ((offset - 8) / 10);
    return Math.min(lowest, multiplier);
  }, 1);
