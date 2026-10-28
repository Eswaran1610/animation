// Pure motion logic: no React, easy to test and reuse.
import {Easing, interpolate} from "remotion";
import type {TCampaign} from "./schema";

export const T = {
  bg: "#1A1916", panel: "#262420", cream: "#F5F1E8", muted: "#9A9488",
  clay: "#D97757", cyan: "#7CC4E8", rose: "#F08BA0", green: "#8FC98F",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "'JetBrains Mono', 'Geist Mono', Menlo, monospace",
};

export const getTheme = (theme?: TCampaign["theme"]) => ({
  ...T,
  bg: theme?.bg || T.bg,
  panel: theme?.panel || T.panel,
  clay: theme?.clay || T.clay,
  cream: theme?.cream || T.cream,
  muted: theme?.muted || T.muted,
});

// Calm, decelerating ease: Claude-style, no bounce.
export const ease = Easing.bezier(0.22, 1, 0.36, 1);

// 0..1 progress of an action starting at `start` lasting `dur` frames.
export const prog = (frame: number, start: number, dur: number) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease,
  });

// Fade/slide-in values for one element.
export const reveal = (frame: number, start: number, dur = 18) => {
  const p = prog(frame, start, dur);
  return {opacity: p, transform: `translateY(${(1 - p) * 28}px)`};
};

// Fade out the last 10 frames of a scene so cuts feel soft.
export const sceneFade = (frame: number, total: number) =>
  interpolate(frame, [total - 10, total], [1, 0], {extrapolateLeft: "clamp"});

export const typewriter = (text: string, frame: number, start: number, cps = 28, fps = 30) => {
  const n = Math.floor(Math.max(0, frame - start) / fps * cps);
  return text.slice(0, n);
};
export const typeDuration = (text: string, cps = 28, fps = 30) =>
  Math.ceil(text.length / cps * fps);

// Timeline: scene start frames + total duration.
export const timeline = (c: TCampaign) => {
  let at = 0;
  const scenes = c.scenes.map((s) => {
    const frames = Math.round(s.seconds * c.fps);
    const out = {scene: s, from: at, frames};
    at += frames;
    return out;
  });
  return {scenes, total: at};
};

// Tiny terminal highlighter (swap for prismjs if you prefer).
export const tokenize = (line: string) =>
  line.split(" ").map((w, i) => ({
    w,
    color: i === 0 ? T.cyan : w.startsWith("--") ? T.rose : w.startsWith('"') ? T.green : T.cream,
  }));
