import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { prepareAudioBed } from "./audioBed";
import { generateMotionPlan } from "./codexPlanWorker";
import { PlanSchema, type MotionPlan } from "./plan";
import { renderMotionPlan } from "./runner";
import { researchWebsite, websiteBriefForPrompt } from "./websiteBrief";

export type JobStatus = "planning" | "validating" | "audio" | "rendering" | "done" | "failed";

export type MotionJob = {
  id: string;
  status: JobStatus;
  content: string;
  options: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  cacheHit: boolean;
  rerenderOf?: string;
  error?: string;
};

const now = () => new Date().toISOString();
const PLANNER_CACHE_VERSION = "website-brief-v2";

// Object key order is not meaningful in request options, so it must not make
// two otherwise identical requests miss the plan cache.
const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

type QueueDependencies = {
  generatePlan?: typeof generateMotionPlan;
  prepareAudio?: typeof prepareAudioBed;
  renderPlan?: typeof renderMotionPlan;
};

export class MotionJobQueue {
  private readonly jobs = new Map<string, MotionJob>();
  private readonly pending: string[] = [];
  private running = false;
  private readonly jobsDir: string;
  private readonly cacheDir: string;
  private readonly dependencies: Required<QueueDependencies>;

  constructor(private readonly workspaceRoot: string, dependencies: QueueDependencies = {}) {
    this.jobsDir = path.join(workspaceRoot, "jobs");
    this.cacheDir = path.join(workspaceRoot, ".motion-cache", "plans");
    this.dependencies = {
      generatePlan: dependencies.generatePlan ?? generateMotionPlan,
      prepareAudio: dependencies.prepareAudio ?? prepareAudioBed,
      renderPlan: dependencies.renderPlan ?? renderMotionPlan,
    };
    fs.mkdirSync(this.jobsDir, { recursive: true });
    fs.mkdirSync(this.cacheDir, { recursive: true });
    this.recoverPersistedJobs();
  }

  create(content: string, options: Record<string, unknown> = {}): MotionJob {
    const job = this.makeJob(content, options);
    this.pending.push(job.id);
    void this.drain();
    return job;
  }

  rerender(id: string): MotionJob {
    const previous = this.get(id);
    if (!previous) throw new Error("Job not found");
    const planPath = path.join(this.jobDir(id), "plan.json");
    if (!fs.existsSync(planPath)) throw new Error("This job has no saved plan to re-render");
    const job = this.makeJob(previous.content, previous.options, id);
    fs.copyFileSync(planPath, path.join(this.jobDir(job.id), "plan.json"));
    this.pending.push(job.id);
    void this.drain();
    return job;
  }

  get(id: string): MotionJob | undefined {
    const memory = this.jobs.get(id);
    if (memory) return memory;
    try {
      const job = JSON.parse(fs.readFileSync(path.join(this.jobDir(id), "job.json"), "utf-8")) as MotionJob;
      this.jobs.set(id, job);
      return job;
    } catch {
      return undefined;
    }
  }

  private makeJob(content: string, options: Record<string, unknown>, rerenderOf?: string) {
    const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const job: MotionJob = { id, status: rerenderOf ? "audio" : "planning", content, options, createdAt: now(), updatedAt: now(), cacheHit: false, rerenderOf };
    this.jobs.set(id, job);
    fs.mkdirSync(this.jobDir(id), { recursive: true });
    fs.mkdirSync(path.join(this.jobDir(id), "audio"), { recursive: true });
    fs.writeFileSync(path.join(this.jobDir(id), "input.txt"), content);
    this.persist(job);
    this.log(job, rerenderOf ? `Re-render queued from ${rerenderOf}; no Codex call will be made.` : "Job queued.");
    return job;
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.pending.length) {
        const id = this.pending.shift()!;
        const job = this.jobs.get(id);
        if (!job) continue;
        try {
          await this.run(job);
        } catch (error) {
          this.setStatus(job, "failed", error instanceof Error ? error.message : String(error));
          this.log(job, `FAILED: ${job.error}`);
        }
      }
    } finally {
      this.running = false;
      if (this.pending.length) void this.drain();
    }
  }

  private async run(job: MotionJob) {
    let plan: MotionPlan;
    if (job.rerenderOf) {
      plan = PlanSchema.parse(JSON.parse(fs.readFileSync(path.join(this.jobDir(job.id), "plan.json"), "utf-8")));
    } else {
      const bypassCache = Boolean(job.options?.fresh || job.options?.regenerate || job.options?.bypassCache);
      const key = createHash("sha256").update(stableJson({ version: PLANNER_CACHE_VERSION, content: job.content, options: job.options })).digest("hex");
      const cachePath = path.join(this.cacheDir, `${key}.json`);
      if (!bypassCache && fs.existsSync(cachePath)) {
        job.cacheHit = true;
        plan = PlanSchema.parse(JSON.parse(fs.readFileSync(cachePath, "utf-8")));
        this.log(job, `Plan cache hit: ${key.slice(0, 12)}.`);
      } else {
        this.setStatus(job, "planning");
        this.log(job, "Calling AGY Motion Director.");
        let planningContent = job.content;
        try {
          const website = await researchWebsite(job.content);
          if (website) {
            fs.writeFileSync(path.join(this.jobDir(job.id), "website.json"), JSON.stringify(website, null, 2));
            planningContent += `\n\nWebsite research (already fetched; use this instead of guessing):\n${websiteBriefForPrompt(website)}`;
            this.log(job, `Website research collected from ${website.url}.`);
          }
        } catch (error) {
          this.log(job, `Website research skipped: ${error instanceof Error ? error.message : String(error)}`);
        }
        const result = await this.dependencies.generatePlan({ content: planningContent, options: job.options, workspaceRoot: this.workspaceRoot });
        plan = result.plan;
        this.log(job, `Planning ${result.source} after ${result.attempts} attempt(s).`);
        if (result.errors.length) this.log(job, `Validation feedback: ${result.errors.join(" | ")}`);
        fs.writeFileSync(cachePath, JSON.stringify(plan, null, 2));
      }
      this.setStatus(job, "validating");
      plan = PlanSchema.parse(plan);
      fs.writeFileSync(path.join(this.jobDir(job.id), "plan.json"), JSON.stringify(plan, null, 2));
      this.log(job, "Plan validated and saved.");
    }

    this.setStatus(job, "audio");
    const duration = Math.max(...plan.scenes.map((scene) => scene.start + scene.dur));
    const prepared = this.dependencies.prepareAudio(plan, duration, this.workspaceRoot, job.id);
    const jobAudio = path.join(this.jobDir(job.id), "audio", path.basename(prepared.assetPath));
    fs.copyFileSync(prepared.assetPath, jobAudio);
    plan = prepared.plan;
    fs.writeFileSync(path.join(this.jobDir(job.id), "plan.json"), JSON.stringify(plan, null, 2));
    this.log(job, `Audio ${prepared.generated ? "generated" : "selected"}: ${path.basename(jobAudio)}.`);

    this.setStatus(job, "rendering");
    await Promise.resolve(this.dependencies.renderPlan(plan, path.join(this.jobDir(job.id), "out.mp4"), path.join(this.jobDir(job.id), "props.json")));
    this.setStatus(job, "done");
    this.log(job, "Render complete.");
  }

  private jobDir(id: string) { return path.join(this.jobsDir, id); }

  /** Keep finished jobs queryable after restart and close interrupted jobs clearly. */
  private recoverPersistedJobs() {
    for (const entry of fs.readdirSync(this.jobsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const job = this.get(entry.name);
      if (!job || ["done", "failed"].includes(job.status)) continue;
      this.setStatus(job, "failed", "Server restarted before this job completed.");
      this.log(job, "FAILED: Server restarted before this job completed.");
    }
  }

  private setStatus(job: MotionJob, status: JobStatus, error?: string) {
    job.status = status;
    job.error = error;
    job.updatedAt = now();
    this.persist(job);
  }

  private persist(job: MotionJob) {
    fs.writeFileSync(path.join(this.jobDir(job.id), "job.json"), JSON.stringify(job, null, 2));
  }

  private log(job: MotionJob, line: string) {
    fs.appendFileSync(path.join(this.jobDir(job.id), "log.txt"), `[${now()}] ${line}\n`);
  }
}
