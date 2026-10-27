/**
 * In-memory job store with full state-machine lifecycle.
 * State: queued → researching → scripting → voiceover → planning_scenes → rendering → validating → completed
 * Also supports: failed | cancelled
 */

import { EventEmitter } from "events";

export type JobStage =
  | "queued"
  | "researching"
  | "scripting"
  | "voiceover"
  | "planning_scenes"
  | "rendering"
  | "validating"
  | "completed"
  | "failed"
  | "cancelled";

export interface SourceReference {
  id: string;
  title: string;
  url: string;
  publisher?: string;
  publicationDate?: string;
  retrievedAt: string;
  supportsClaims: string[];
}

export interface ScenePlan {
  id: string;
  durationSeconds: number;
  component: string;
  narration: string;
  onScreenText: string;
  visualDirection: string;
  sourceIds: string[];
  type: string;
  tag?: string;
  accentWord?: string;
  subtitle?: string;
  terminalCommand?: string;
  terminalOutput?: string;
  terminalAlert?: string;
  beforeAfter?: {
    beforeTitle: string;
    beforeItems: string[];
    afterTitle: string;
    afterItems: string[];
  };
  items?: string[];
  metricTarget?: number;
  metricSuffix?: string;
  metricLabel?: string;
  secondaryMetricValue?: string;
  secondaryMetricLabel?: string;
  ctaHeadline?: string;
  trustBadges?: string[];
  nodeLeft?: { icon?: string; label: string; status: string; sub?: string };
  nodeCenter?: { icon?: string; label: string; sub: string; status?: string };
  nodeRight?: { icon?: string; label: string; sub: string; status?: string };
}

export interface VideoJob {
  id: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  stage: JobStage;
  progress: number; // 0-100
  instructions: string;
  settings: {
    topic?: string;
    audience?: string;
    style?: string;
    targetDurationSeconds: number;
    fps: number;
    aspectRatio: "9:16" | "16:9" | "1:1";
    theme?: string;
    pipelineMode?: "codex-local" | "claim-linked" | "legacy";
    geminiApiKey?: string;
  };
  sources: SourceReference[];
  researchSummary?: string;
  script?: string;
  scenePlan?: ScenePlan[];
  videoTitle?: string;
  voiceoverPath?: string;
  voiceoverDurationSeconds?: number;
  voiceProvider?: string;
  pipelineArtifactDirectory?: string;
  outputVideoPath?: string;
  outputVideoUrl?: string;
  outputDurationSeconds?: number;
  outputFps?: number;
  outputResolution?: string;
  outputFileSizeBytes?: number;
  validationPassed?: boolean;
  validationDetails?: string;
  errorMessage?: string;
  failedStage?: JobStage;
  retryCount: number;
  cancelRequested: boolean;
}

// In-memory store. In production this would be PostgreSQL.
const jobs = new Map<string, VideoJob>();
export const jobEvents = new EventEmitter();

export function createJob(
  instructions: string,
  settings: VideoJob["settings"]
): VideoJob {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const job: VideoJob = {
    id,
    createdAt: now,
    updatedAt: now,
    stage: "queued",
    progress: 0,
    instructions,
    settings,
    sources: [],
    retryCount: 0,
    cancelRequested: false,
  };
  jobs.set(id, job);
  jobEvents.emit("created", job);
  return job;
}

export function getJob(id: string): VideoJob | undefined {
  return jobs.get(id);
}

export function listJobs(): VideoJob[] {
  return Array.from(jobs.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function updateJob(id: string, patch: Partial<VideoJob>): VideoJob {
  const job = jobs.get(id);
  if (!job) throw new Error(`Job ${id} not found`);
  const updated = { ...job, ...patch, updatedAt: new Date().toISOString() };
  jobs.set(id, updated);
  jobEvents.emit("updated", updated);
  return updated;
}

export function advanceStage(
  id: string,
  stage: JobStage,
  progress: number,
  extraData?: Partial<VideoJob>
): VideoJob {
  return updateJob(id, { stage, progress, ...extraData });
}

export function failJob(
  id: string,
  errorMessage: string,
  failedStage: JobStage
): VideoJob {
  return updateJob(id, {
    stage: "failed",
    errorMessage,
    failedStage,
    progress: 0,
  });
}

export function cancelJob(id: string): VideoJob {
  const job = jobs.get(id);
  if (!job) throw new Error(`Job ${id} not found`);
  if (["completed", "failed", "cancelled"].includes(job.stage)) {
    throw new Error(`Job ${id} is already in terminal state: ${job.stage}`);
  }
  return updateJob(id, { cancelRequested: true, stage: "cancelled" });
}
