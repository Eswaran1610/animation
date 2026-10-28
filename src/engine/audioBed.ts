import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PlanSchema, type MotionPlan } from "./plan";

const isPublicAsset = (asset: string) => /^[a-zA-Z0-9_./-]+\.(wav|mp3|m4a)$/i.test(asset) && !asset.includes("..");

const oscillatorBase = (mood: string) => {
  const normalized = mood.toLowerCase();
  if (normalized.includes("warm") || normalized.includes("calm")) return 110;
  if (normalized.includes("dark") || normalized.includes("cinematic")) return 55;
  if (normalized.includes("upbeat") || normalized.includes("bright")) return 146.83;
  return 73.42;
};

const generatedAssetName = (outputKey: string) =>
  `${outputKey.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "motion"}-bed.wav`;

export type PreparedAudio = { plan: MotionPlan; assetPath: string; generated: boolean };

/**
 * Produces one render-ready music bed. Existing approved assets are looped and
 * trimmed; otherwise FFmpeg synthesizes a gentle, BPM-linked ambient bed.
 */
export const prepareAudioBed = (
  planInput: MotionPlan,
  durationSeconds: number,
  workspaceRoot: string,
  outputKey: string,
): PreparedAudio => {
  const plan = PlanSchema.parse(planInput);
  const publicDir = path.join(workspaceRoot, "public");
  const relativeOutput = path.posix.join("generated-audio", generatedAssetName(outputKey));
  const outputPath = path.join(publicDir, relativeOutput);
  const seconds = Math.max(1, Number(durationSeconds.toFixed(3)));
  let requestedAsset = plan.audio.bed.asset;

  // Auto-select rich music bed matching the video mood if none explicitly set
  if (!requestedAsset) {
    const mood = plan.audio.bed.mood.toLowerCase();
    const primary = plan.theme.palette.primary.toLowerCase();
    if (mood.includes("claude") || mood.includes("calm") || mood.includes("warm") || primary === "#d97757") {
      requestedAsset = "claude_audio.wav";
    } else {
      requestedAsset = "cyber_audio.wav";
    }
  }

  const sourcePath = requestedAsset && isPublicAsset(requestedAsset)
    ? path.join(publicDir, requestedAsset)
    : undefined;
  const canUseSource = sourcePath && fs.existsSync(sourcePath);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  if (canUseSource) {
    const fadeOutStart = Math.max(0, seconds - 1.5);
    execFileSync("ffmpeg", [
      "-y", "-stream_loop", "-1", "-i", sourcePath,
      "-t", String(seconds),
      "-af", `afade=t=in:ss=0:d=0.8,afade=t=out:st=${fadeOutStart}:d=1.5`,
      "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", outputPath,
    ], { stdio: "ignore" });
  } else {
    const base = oscillatorBase(plan.audio.bed.mood);
    const pulse = Number((plan.audio.bed.bpm / 60).toFixed(6));
    const expression = `0.055*sin(2*PI*${base}*t)*(0.72+0.28*sin(2*PI*${pulse}*t))+0.018*sin(2*PI*${base * 1.5}*t)+0.012*sin(2*PI*${base * 4}*t)`;
    execFileSync("ffmpeg", [
      "-y", "-f", "lavfi", "-i", `aevalsrc=${expression}:s=48000:d=${seconds}`,
      "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", outputPath,
    ], { stdio: "ignore" });
  }

  return {
    plan: PlanSchema.parse({ ...plan, audio: { ...plan.audio, bed: { ...plan.audio.bed, asset: relativeOutput } } }),
    assetPath: outputPath,
    generated: !canUseSource,
  };
};
