import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { MotionPlanJsonSchema, PlanSchema, SceneCatalog, campaignToMotionPlan, type MotionPlan } from "./plan";
import { appendPlanHistory, describeRecentStyles, readRecentPlans } from "./planHistory";
import { askGemini } from "./geminiDirector";

const MAX_ATTEMPTS = 3;

export type PlanRequest = {
  content: string;
  options?: Record<string, unknown>;
  workspaceRoot?: string;
};

type CodexRunInput = {
  prompt: string;
  schemaPath: string;
  outputPath: string;
  workspaceRoot: string;
};

export type CodexPlanRunner = (input: CodexRunInput) => Promise<string>;

export type PlanGenerationResult = {
  plan: MotionPlan;
  source: "agy" | "codex" | "gemini" | "fallback";
  attempts: number;
  errors: string[];
};

const truncate = (value: string, limit: number) => value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
const tail = (value: string, limit: number) => value.length > limit ? `…${value.slice(-limit + 1)}` : value;

const stripNulls = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripNulls);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== null)
      .map(([key, child]) => [key, stripNulls(child)]));
  }
  return value;
};

const validatePlan = (raw: string): MotionPlan => {
  const json = raw.trim().replace(/^```json\s*|\s*```$/g, "");
  const parsed = stripNulls(JSON.parse(json));
  return PlanSchema.parse(parsed);
};

/** OpenAI structured output requires every object key to be required. */
const codexOutputSchema = () => {
  const schema = JSON.parse(JSON.stringify(MotionPlanJsonSchema)) as Record<string, any>;
  const visit = (node: any): any => {
    if (!node || typeof node !== "object") return node;
    // Zod records add this keyword; OpenAI strict schemas reject it.
    delete node.propertyNames;
    if (node.properties) {
      const originallyRequired = new Set<string>(node.required ?? []);
      for (const [key, child] of Object.entries(node.properties)) {
        const transformed = visit(child);
        node.properties[key] = originallyRequired.has(key) ? transformed : { anyOf: [transformed, { type: "null" }] };
      }
      node.required = Object.keys(node.properties);
      // Plans do not need arbitrary keys; params remains an empty object.
      node.additionalProperties = false;
    }
    if (node.type === "object" && !node.properties) {
      node.properties = {};
      node.required = [];
      node.additionalProperties = false;
    }
    if (node.items) node.items = visit(node.items);
    for (const key of ["anyOf", "oneOf", "allOf"] as const) if (Array.isArray(node[key])) node[key] = node[key].map(visit);
    if (node.$defs) for (const child of Object.values(node.$defs)) visit(child);
    return node;
  };
  return visit(schema);
};

const issueText = (error: unknown) => {
  if (error && typeof error === "object" && "issues" in error) {
    return (error as { issues: Array<{ path: PropertyKey[]; message: string }> }).issues
      .map((issue) => `${issue.path.join(".") || "plan"}: ${issue.message}`)
      .join("; ");
  }
  return error instanceof Error ? error.message : String(error);
};

export const safeFallbackPlan = (content: string, options: Record<string, unknown> = {}): MotionPlan => {
  const p = content.toLowerCase();
  const isClaude = p.includes("claude") || options?.theme === "claude";
  const isCyber = p.includes("cyber") || p.includes("security") || p.includes("vpn") || options?.theme === "cyber";
  const isFintech = p.includes("fintech") || p.includes("trade") || p.includes("crypto") || options?.theme === "fintech";

  const styleSeed = createHash("sha256").update(JSON.stringify({ content, options, t: Date.now() })).digest("hex").slice(0, 16);
  const headline = truncate(content.trim() || (isClaude ? "Claude Code Autonomous Engineering" : "Turn your idea into motion"), 84);

  const primary = isClaude ? "#D97757" : isCyber ? "#10B981" : isFintech ? "#F59E0B" : "#6366F1";
  const accent = isClaude ? "#E09F67" : isCyber ? "#06B6D4" : isFintech ? "#10B981" : "#EC4899";
  const background = isClaude ? "#181714" : isFintech ? "#060A12" : "#080C14";

  return PlanSchema.parse({
    meta: { fps: 30, size: { width: 1080, height: 1920 }, mood: isClaude ? "claude" : "cinematic", styleSeed },
    theme: {
      palette: { background, foreground: isClaude ? "#F5F1E8" : "#F8FAFC", primary, accent, muted: "#94A3B8" },
      fonts: { heading: isClaude ? "Georgia, serif" : "Inter, sans-serif", body: "Inter, sans-serif", mono: "monospace" },
      easing: "cinematic",
      motionIntensity: "medium",
      background: isClaude ? "paper" : "gradient",
    },
    scenes: [
      { id: "hook", type: "kinetic_hook", start: 0, dur: 5, content: { headline, eyebrow: isClaude ? "CLAUDE CODE" : "SYSTEM ARCHITECTURE" }, params: {} },
      { id: "terminal", type: "typing_terminal", start: 5, dur: 6, content: {
          headline: isClaude ? "Autonomous Code Refactoring" : "Sub-Second Production Execution",
          command: isClaude ? "claude review --strict --branch=main" : "engine deploy --verify --production",
          output: "✔ AST parsed in 0.8s. 0 regressions detected. 100% verified."
        }, params: {} },
      { id: "diff", type: "before_after", start: 11, dur: 5, content: {
          headline: isClaude ? "Clean Decoupled Architecture" : "Modern High-Velocity Pipeline",
          before: ["Manual fragile workflows", "Slow review cycles"],
          after: ["100% Deterministic execution", "Instant autonomous fixes"]
        }, params: {} },
      { id: "proof", type: "stat_counter", start: 16, dur: 4, content: {
          headline: "Measurable Production Velocity",
          value: "98%",
          label: "Engineering Cycle Acceleration"
        }, params: {} },
      { id: "cta", type: "cta", start: 20, dur: 4, content: {
          headline: isClaude ? "Experience Claude Code CLI" : "Deploy Your Vision Today",
          cta: isClaude ? "claude.ai/code →" : "Get Started Free →"
        }, params: {} },
    ],
    audio: { bed: { mood: isClaude ? "claude" : "cinematic", bpm: isClaude ? 85 : 100 }, sfxCues: [] },
  });
};

const buildPrompt = (request: PlanRequest, recentPlans: MotionPlan[], validationFeedback?: string) => `
You are a world-class Motion Graphics Creative Director designing high-converting, vertical (1080x1920, 30fps) Remotion product promo videos.
Produce exactly one JSON object matching the JSON Schema.

CREATIVE DIRECTION RULES:
1. PUNCHY, CODE-DRIVEN STORYTELLING:
   - Make it feel like an authentic, high-end tech video (Claude Code, Linear, Stripe).
   - Hook the viewer in Scene 1 (kinetic_hook) with a bold headline and eyebrow.
   - For dev tools / CLI / AI agents: include typing_terminal with realistic commands (e.g., \`claude "refactor src/auth.ts"\`, \`cargo check\`) and verified outputs.
   - For transformations: include before_after or code_diff.
   - For metrics & stats: include stat_counter (e.g. value "10x", "85%", "0 CVEs").
   - End with a compelling conversion cta.

2. THEME & ART DIRECTION:
   - If the topic relates to Claude Code or developer agents:
     * mood: "claude"
     * palette: background "#181714", foreground "#F5F1E8", primary "#D97757" (clay/terracotta), accent "#E09F67" (amber), muted "#8C827A"
     * fonts: heading "Georgia, serif", body "Inter, sans-serif", mono: "JetBrains Mono, monospace"
     * audio bed: mood "claude", bpm 85
   - If cyber / security: primary "#10B981" (emerald neon), accent "#06B6D4" (cyan), background "#030712", audio bed mood "cyber", bpm 110.
   - If fintech: primary "#F59E0B" (gold), accent "#10B981", background "#080C14", audio bed mood "fintech", bpm 100.
   - If SaaS / indigo: primary "#6366F1", accent "#EC4899", background "#080C14".

3. SCENE CATALOG:
${JSON.stringify(SceneCatalog, null, 2)}

4. OUTPUT REQUIREMENTS:
   - meta.fps must be 30 and meta.size must be { width: 1080, height: 1920 }.
   - Ordered scenes with start time and duration (total video duration ~20-25s).
   - Return valid JSON matching the schema.
   - Do NOT attempt to run tools, fetch URLs, or execute commands. All relevant context is provided directly in this prompt.

Recent style history:
${JSON.stringify(describeRecentStyles(recentPlans), null, 2)}

User Content Sample:
${request.content}

Options:
${JSON.stringify(request.options ?? {}, null, 2)}
${validationFeedback ? `\nPrevious output had validation issues: ${validationFeedback}. Correct and return valid JSON only.` : ""}
`.trim();

/** Uses AGY CLI non-interactive execution with structured output schema. */
export const runAgyPlan: CodexPlanRunner = async ({ prompt, schemaPath, workspaceRoot }) => {
  const model = process.env.AGY_MODEL || "gemini-3.8-flash-low";
  const args = [
    "--model", model,
    "--json-schema", schemaPath,
    "--output-format", "json",
    "--dangerously-skip-permissions",
    "--disable-slash-commands",
    "-p", prompt,
  ];

  const stdout = await new Promise<string>((resolve, reject) => {
    const child = spawn("agy", args, { cwd: workspaceRoot, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => { out += chunk.toString(); });
    child.stderr.on("data", (chunk) => { err += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0 && out.trim()) {
        resolve(out);
      } else {
        let detail = tail(err.trim(), 2000);
        if (!detail && out.trim()) {
          try {
            const parsed = JSON.parse(out);
            detail = parsed.error || parsed.status || tail(out.trim(), 2000);
          } catch {
            detail = tail(out.trim(), 2000);
          }
        }
        reject(new Error(`agy exited ${code}${detail ? `: ${detail}` : ""}`));
      }
    });
  });

  const parsed = JSON.parse(stdout);
  if (parsed.status === "ERROR" || parsed.error) {
    throw new Error(parsed.error || `agy returned error status: ${parsed.status}`);
  }
  if (parsed.status === "CANCELED") {
    throw new Error(`agy was canceled: ${tail(parsed.error || parsed.response || stdout, 500)}`);
  }
  let planObj = parsed.structured_output;
  if (!planObj && parsed.response) {
    try {
      planObj = JSON.parse(parsed.response.replace(/```json\s*|\s*```/g, ""));
    } catch {
      // not direct json string
    }
  }
  if (!planObj || typeof planObj !== "object" || Object.keys(planObj).length === 0) {
    throw new Error(`agy produced no valid plan data (status: ${parsed.status})`);
  }
  return JSON.stringify(planObj);
};

/** Kept for backwards compatibility. */
export const runCodexPlan: CodexPlanRunner = async ({ prompt, schemaPath, outputPath, workspaceRoot }) => {
  const args = [
    "exec",
    "--sandbox", "read-only",
    "--output-schema", schemaPath,
    "--output-last-message", outputPath,
    "--cd", workspaceRoot,
    prompt,
  ];

  await new Promise<void>((resolve, reject) => {
    const child = spawn("codex", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`codex exec exited ${code}: ${tail(stderr, 4_000)}`)));
  });

  return fs.readFile(outputPath, "utf-8");
};

export const generateMotionPlan = async (
  request: PlanRequest,
  runner: CodexPlanRunner = runAgyPlan,
): Promise<PlanGenerationResult> => {
  const workspaceRoot = request.workspaceRoot ?? process.cwd();
  const recentPlans = await readRecentPlans(workspaceRoot);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "motion-plan-"));
  const schemaPath = path.join(tempDir, "motion-plan.schema.json");
  const outputPath = path.join(tempDir, "plan.json");
  const errors: string[] = [];

  try {
    await fs.writeFile(schemaPath, JSON.stringify(codexOutputSchema(), null, 2));
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const raw = await runner({
          prompt: buildPrompt(request, recentPlans, errors.at(-1)),
          schemaPath,
          outputPath,
          workspaceRoot,
        });
        const plan = validatePlan(raw);
        await appendPlanHistory(workspaceRoot, plan);
        return { plan, source: "agy", attempts: attempt, errors };
      } catch (error) {
        errors.push(issueText(error));
      }
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }

  // Tier 2 Fallback: Direct Gemini Director call
  try {
    const geminiCampaign = await askGemini(request.content);
    if (geminiCampaign) {
      const plan = campaignToMotionPlan(geminiCampaign);
      return { plan, source: "gemini", attempts: MAX_ATTEMPTS, errors };
    }
  } catch (error) {
    errors.push(`Gemini fallback: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Tier 3 Fallback: Context-aware dynamic fallback
  return { plan: safeFallbackPlan(request.content, request.options), source: "fallback", attempts: MAX_ATTEMPTS, errors };
};
