import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

export const PROJECT_ROOT = path.join(__dirname, "../..");
export const OUTPUT_DIR = path.join(PROJECT_ROOT, "out");
export const CAMPAIGNS_DIR = path.join(PROJECT_ROOT, "campaigns");

export function ensureVideoDirectories() {
  for (const directory of [OUTPUT_DIR, CAMPAIGNS_DIR]) {
    if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
  }
}

export interface RenderCompositionOptions {
  compositionId: string;
  outputPath: string;
  propsPath: string;
  frames?: string;
  timeoutMs?: number;
  concurrency?: number;
  cwd?: string;
}

export function renderComposition({
  compositionId,
  outputPath,
  propsPath,
  frames,
  timeoutMs,
  concurrency,
  cwd = PROJECT_ROOT,
}: RenderCompositionOptions) {
  const args = [
    "remotion",
    "render",
    "src/index.tsx",
    compositionId,
    outputPath,
    `--props=${propsPath}`,
  ];

  if (frames) args.push(`--frames=${frames}`);
  args.push("--overwrite");
  if (timeoutMs !== undefined) args.push(`--timeout=${timeoutMs}`);
  if (concurrency !== undefined) args.push(`--concurrency=${concurrency}`);

  execFileSync("npx", args, { stdio: "inherit", cwd });
}

export interface ContactSheetOptions {
  videoPath: string;
  outputPath: string;
  sampleEverySeconds?: number;
  scaleWidth?: number;
  tile?: string;
  cwd?: string;
  stdio?: "inherit" | "pipe";
}

export function createContactSheet({
  videoPath,
  outputPath,
  sampleEverySeconds = 1,
  scaleWidth = 450,
  tile = "5x2",
  cwd = PROJECT_ROOT,
  stdio = "inherit",
}: ContactSheetOptions) {
  const interval = Math.max(1, sampleEverySeconds);
  const filter = `fps=1/${interval},scale=${scaleWidth}:-1,tile=${tile}`;

  execFileSync(
    "ffmpeg",
    ["-y", "-i", videoPath, "-vf", filter, "-frames:v", "1", outputPath],
    { stdio, cwd }
  );
}

export interface VideoProbe {
  durationSeconds: number;
  fps: number;
  width?: number;
  height?: number;
  fileSizeBytes: number;
  hasVideoStream: boolean;
}

function parseFrameRate(value?: string): number {
  if (!value) return 0;
  const [numerator, denominator] = value.split("/").map(Number);
  if (!Number.isFinite(numerator)) return 0;
  if (!Number.isFinite(denominator) || denominator === 0) return numerator;
  return numerator / denominator;
}

export function probeVideo(videoPath: string, cwd = PROJECT_ROOT): VideoProbe {
  const stat = fs.statSync(videoPath);
  const raw = execFileSync(
    "ffprobe",
    ["-v", "quiet", "-print_format", "json", "-show_streams", "-show_format", videoPath],
    { encoding: "utf-8", cwd }
  );
  const data = JSON.parse(raw);
  const videoStream = data.streams?.find((stream: any) => stream.codec_type === "video");

  return {
    durationSeconds: parseFloat(data.format?.duration || "0"),
    fps: parseFrameRate(videoStream?.r_frame_rate),
    width: videoStream?.width,
    height: videoStream?.height,
    fileSizeBytes: stat.size,
    hasVideoStream: Boolean(videoStream),
  };
}
