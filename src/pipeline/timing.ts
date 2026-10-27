import { ScenesArtifact, ScriptArtifact, TimingArtifact, TimingArtifactSchema } from "./schema";

export function buildTiming(script: ScriptArtifact, scenes: ScenesArtifact): TimingArtifact {
  let sceneStart = 0;
  const sceneTimings: TimingArtifact["scenes"] = [];
  const words: TimingArtifact["words"] = [];

  scenes.scenes.forEach((scene, index) => {
    const sceneEnd = sceneStart + scene.durationSeconds;
    const line = script.lines[index];
    const lineWords = line.text.trim().split(/\s+/).filter(Boolean);
    const wordDuration = scene.durationSeconds / Math.max(1, lineWords.length);
    lineWords.forEach((word, wordIndex) => {
      const start = sceneStart + wordIndex * wordDuration;
      words.push({ word, startSeconds: Number(start.toFixed(3)), endSeconds: Number((start + wordDuration).toFixed(3)), sceneId: scene.id });
    });
    sceneTimings.push({
      sceneId: scene.id,
      startSeconds: Number(sceneStart.toFixed(3)),
      endSeconds: Number(sceneEnd.toFixed(3)),
      startFrame: Math.round(sceneStart * scenes.meta.fps),
      endFrame: Math.max(1, Math.round(sceneEnd * scenes.meta.fps) - 1),
    });
    sceneStart = sceneEnd;
  });

  return TimingArtifactSchema.parse({
    method: "reading_speed_estimate",
    fps: scenes.meta.fps,
    totalDurationSeconds: Number(sceneStart.toFixed(3)),
    words,
    scenes: sceneTimings,
  });
}

function srtTime(seconds: number): string {
  const ms = Math.round(seconds * 1000);
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

export function timingToSrt(timing: TimingArtifact): string {
  return timing.scenes.map((scene, index) => {
    const words = timing.words.filter((word) => word.sceneId === scene.sceneId).map((word) => word.word).join(" ");
    return `${index + 1}\n${srtTime(scene.startSeconds)} --> ${srtTime(scene.endSeconds)}\n${words}\n`;
  }).join("\n");
}
