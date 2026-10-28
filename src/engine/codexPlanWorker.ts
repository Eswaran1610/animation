import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { MotionPlanJsonSchema, PlanSchema, SceneCatalog, campaignToMotionPlan, type MotionPlan, type PlanSceneType } from "./plan";
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
  const themeOpt = typeof options?.theme === "string" ? options.theme : "";
  const requestedDuration = Number(content.match(/(\d+)\s*s(?:econds?)?/i)?.[1]) || 24;

  const isClaude = p.includes("claude") || themeOpt === "claude";
  const isCyber = p.includes("cyber") || p.includes("security") || p.includes("vpn") || p.includes("rce") || p.includes("shield") || themeOpt === "cyber";
  const isFintech = p.includes("fintech") || p.includes("trade") || p.includes("trading") || p.includes("crypto") || p.includes("stock") || p.includes("payment") || themeOpt === "fintech";
  const isAI = p.includes("huggingface") || p.includes("model") || p.includes("weights") || p.includes("dataset") || p.includes("neural") || p.includes("llm") || p.includes("inference") || p.includes("deepseek");
  const isCloud = p.includes("cloud") || p.includes("docker") || p.includes("kubernetes") || p.includes("cluster") || p.includes("deploy") || p.includes("api") || p.includes("infra");

  const category = isClaude ? "claude" : isCyber ? "cyber" : isFintech ? "fintech" : isAI ? "ai" : isCloud ? "cloud" : "saas";

  const cleanText = content.replace(/https?:\/\/[^\s]+/g, "").replace(/\b(?:visit|website|generate|motion|animation|\d+s)\b/gi, "").trim();
  const headline = truncate(cleanText || (isClaude ? "Claude Code Autonomous Engineering" : isAI ? "Open Machine Learning Intelligence" : isCyber ? "Autonomous Zero-Trust Defense" : isFintech ? "Sub-Millisecond Financial Velocity" : "Transform Your Workflow In Motion"), 80);

  const styleSeed = createHash("sha256").update(JSON.stringify({ content, options, t: Date.now(), r: Math.random() })).digest("hex").slice(0, 16);

  type CategoryStyle = {
    palette: { background: string; foreground: string; primary: string; accent: string; muted: string };
    fonts: { heading: string; body: string; mono: string };
    background: "aurora" | "grid" | "paper" | "gradient" | "noise";
    easing: "calm" | "snappy" | "cinematic";
    motionIntensity: "low" | "medium" | "high";
    mood: string;
    bpm: number;
  };

  const styles: Record<string, CategoryStyle> = {
    claude: {
      palette: { background: "#181714", foreground: "#F5F1E8", primary: "#D97757", accent: "#E09F67", muted: "#8C827A" },
      fonts: { heading: "Georgia, serif", body: "Inter, sans-serif", mono: "JetBrains Mono, monospace" },
      background: "paper",
      easing: "cinematic",
      motionIntensity: "medium",
      mood: "claude",
      bpm: 85,
    },
    cyber: {
      palette: { background: "#030712", foreground: "#F8FAFC", primary: "#10B981", accent: "#06B6D4", muted: "#64748B" },
      fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", mono: "JetBrains Mono, monospace" },
      background: "grid",
      easing: "snappy",
      motionIntensity: "high",
      mood: "cyber",
      bpm: 110,
    },
    fintech: {
      palette: { background: "#060A12", foreground: "#F8FAFC", primary: "#F59E0B", accent: "#10B981", muted: "#78716C" },
      fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", mono: "JetBrains Mono, monospace" },
      background: "noise",
      easing: "snappy",
      motionIntensity: "high",
      mood: "fintech",
      bpm: 105,
    },
    ai: {
      palette: { background: "#090D1A", foreground: "#F8FAFC", primary: "#8B5CF6", accent: "#EC4899", muted: "#94A3B8" },
      fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", mono: "JetBrains Mono, monospace" },
      background: "aurora",
      easing: "cinematic",
      motionIntensity: "high",
      mood: "ai",
      bpm: 96,
    },
    cloud: {
      palette: { background: "#080C14", foreground: "#F8FAFC", primary: "#38BDF8", accent: "#818CF8", muted: "#94A3B8" },
      fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", mono: "JetBrains Mono, monospace" },
      background: "grid",
      easing: "snappy",
      motionIntensity: "medium",
      mood: "cloud",
      bpm: 100,
    },
    saas: {
      palette: { background: "#080C14", foreground: "#F8FAFC", primary: "#6366F1", accent: "#EC4899", muted: "#94A3B8" },
      fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", mono: "JetBrains Mono, monospace" },
      background: "gradient",
      easing: "cinematic",
      motionIntensity: "medium",
      mood: "saas",
      bpm: 100,
    },
  };

  const chosenStyle = styles[category] || styles.saas;

  // Custom primary color override from options if valid hex
  if (typeof options.primaryColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(options.primaryColor)) {
    chosenStyle.palette.primary = options.primaryColor;
  }

  // Construct diverse scenes per archetype category
  type RawScene = { type: PlanSceneType; dur: number; content: Record<string, unknown> };
  let rawScenes: RawScene[] = [];

  if (category === "ai") {
    rawScenes = [
      {
        type: "kinetic_hook",
        dur: 4.5,
        content: { headline, eyebrow: "OPEN AI ECOSYSTEM", body: "Accelerate discovery, training, and inference on one open platform." },
      },
      {
        type: "card_reveal",
        dur: 5.5,
        content: {
          headline: "Unified Foundation Infrastructure",
          eyebrow: "ALL MODALITIES",
          items: ["2M+ Open Weight Models", "500k+ Clean Multimodal Datasets", "Serverless GPU Inference Endpoints"],
          body: "Scale from experimentation to distributed production in one click.",
        },
      },
      {
        type: "stat_counter",
        dur: 4.5,
        content: { headline: "Enterprise Scale & Adoption", eyebrow: "VERIFIED TRACTION", value: "400K+", label: "Organizations Building On Open Weights" },
      },
      {
        type: "quote",
        dur: 4.5,
        content: { headline: "Production Intelligence", quote: "The global epicenter of machine learning collaboration and reproducible science.", attribution: "Frontier AI Consortium" },
      },
      {
        type: "cta",
        dur: 4.0,
        content: { headline: "Build With Open Models Today", eyebrow: "ZERO LOCK-IN", cta: "Explore Models & Spaces →" },
      },
    ];
  } else if (category === "cyber") {
    rawScenes = [
      {
        type: "kinetic_hook",
        dur: 4.5,
        content: { headline, eyebrow: "ZERO TRUST POSTURE", body: "Continuous biometric verification and microsegmentation for modern clouds." },
      },
      {
        type: "network_topology",
        dur: 5.5,
        content: {
          headline: "Decoupled Zero-Trust Architecture",
          eyebrow: "ISOLATION MESH",
          nodes: [
            { id: "client", label: "Identity & Client" },
            { id: "gateway", label: "Zero-Trust Proxy" },
            { id: "workload", label: "Workload Cluster" },
            { id: "vault", label: "Encrypted Data Vault" },
          ],
        },
      },
      {
        type: "before_after",
        dur: 5.0,
        content: {
          headline: "Eliminate Lateral Breach Exposure",
          eyebrow: "BEFORE VS AFTER",
          before: ["Open internal WANs", "Static VPN credentials", "Blindspot lateral movement"],
          after: ["Dynamic micro-tunnels", "Ephemerally signed mTLS", "Zero lateral attack surface"],
        },
      },
      {
        type: "stat_counter",
        dur: 4.0,
        content: { headline: "Measurable Threat Neutralization", eyebrow: "AUDITED IMPACT", value: "0", label: "Uncontained CVE Exploitations Detected" },
      },
      {
        type: "cta",
        dur: 4.0,
        content: { headline: "Deploy Zero Trust Architecture", eyebrow: "5 MINUTE ENROLLMENT", cta: "Get Started Free →" },
      },
    ];
  } else if (category === "fintech") {
    rawScenes = [
      {
        type: "kinetic_hook",
        dur: 4.5,
        content: { headline, eyebrow: "INSTANT LIQUIDITY", body: "Ultra-low latency portfolio telemetry with real-time risk settlement." },
      },
      {
        type: "stat_counter",
        dur: 4.5,
        content: { headline: "Sub-Millisecond Execution Speed", eyebrow: "BENCHMARK PERFORMANCE", value: "0.2ms", label: "Average Atomic Clearing & Settlement Latency" },
      },
      {
        type: "card_reveal",
        dur: 5.0,
        content: {
          headline: "Engineered For Sovereign Velocity",
          eyebrow: "CORE ADVANTAGES",
          items: ["Continuous Risk Telemetry", "Cross-Exchange Arbitrage Router", "100% Deterministic Accounting"],
        },
      },
      {
        type: "list_build",
        dur: 5.0,
        content: {
          headline: "Three-Stage Transaction Pipeline",
          eyebrow: "EXECUTION PHASES",
          items: ["Ingest global order book depth", "Run sub-microsecond risk checks", "Execute zero-slippage settlement"],
        },
      },
      {
        type: "cta",
        dur: 4.0,
        content: { headline: "Power Your Trading Infrastructure", eyebrow: "SOC-2 CERTIFIED", cta: "Access Sandbox API →" },
      },
    ];
  } else if (category === "claude") {
    rawScenes = [
      {
        type: "kinetic_hook",
        dur: 4.5,
        content: { headline, eyebrow: "CLAUDE CODE CLI", body: "Autonomous engineering across your terminal with mathematical certainty." },
      },
      {
        type: "typing_terminal",
        dur: 6.0,
        content: {
          headline: "Refactor Large Codebases Intelligently",
          eyebrow: "LIVE TERMINAL RUNTIME",
          command: "claude review --strict --fix-type-errors src/auth.ts",
          output: "✔ AST parsed in 0.4s. 3 regressions repaired. 100% TypeScript verified.",
        },
      },
      {
        type: "code_diff",
        dur: 5.0,
        content: {
          headline: "Zero-Regression Code Evolution",
          eyebrow: "BEFORE VS AFTER",
          before: "const user = req.body; // Unchecked raw payload",
          after: "const user = UserSchema.parse(req.body); // 100% type safe",
        },
      },
      {
        type: "stat_counter",
        dur: 4.0,
        content: { headline: "Engineering Cycle Acceleration", eyebrow: "MEASURED IMPACT", value: "85%", label: "Reduction In Pull Request Review Latency" },
      },
      {
        type: "cta",
        dur: 4.0,
        content: { headline: "Experience Claude Code CLI", eyebrow: "LOCAL & AUTONOMOUS", cta: "claude.ai/code →" },
      },
    ];
  } else {
    rawScenes = [
      {
        type: "kinetic_hook",
        dur: 4.5,
        content: { headline, eyebrow: "PRODUCT SHOWCASE", body: "Transforming how high-performing teams build and deliver modern software." },
      },
      {
        type: "card_reveal",
        dur: 5.0,
        content: {
          headline: "Designed For Unmatched Productivity",
          eyebrow: "KEY CAPABILITIES",
          items: ["Instant Real-Time Collaboration", "Code-Driven Deterministic Exports", "Multi-Platform Automated Sync"],
        },
      },
      {
        type: "before_after",
        dur: 5.0,
        content: {
          headline: "From Friction To Autonomous Velocity",
          eyebrow: "TRANSFORMATION",
          before: ["Manual fragmented tools", "Slow iterative cycles"],
          after: ["Unified modern engine", "Sub-second verified output"],
        },
      },
      {
        type: "stat_counter",
        dur: 4.5,
        content: { headline: "Proven Production Acceleration", eyebrow: "METRIC PROOF", value: "10x", label: "Faster Delivery Cycle vs Traditional Workflows" },
      },
      {
        type: "cta",
        dur: 4.0,
        content: { headline: "Launch Your Next Project Today", eyebrow: "GET STARTED NOW", cta: "Start Free Trial →" },
      },
    ];
  }

  // Calculate chronological starts without overlaps
  let currentStart = 0;
  const scenes = rawScenes.map((s, idx) => {
    const scene = {
      id: `scene-${idx + 1}-${s.type}`,
      type: s.type,
      start: currentStart,
      dur: s.dur,
      content: s.content,
      params: {},
    };
    currentStart = Math.round((currentStart + s.dur) * 10) / 10;
    return scene;
  });

  return PlanSchema.parse({
    meta: {
      fps: 30,
      size: { width: 1080, height: 1920 },
      mood: chosenStyle.mood,
      styleSeed,
    },
    theme: {
      palette: chosenStyle.palette,
      fonts: chosenStyle.fonts,
      easing: chosenStyle.easing,
      motionIntensity: chosenStyle.motionIntensity,
      background: chosenStyle.background,
    },
    scenes,
    audio: {
      bed: { mood: chosenStyle.mood, bpm: chosenStyle.bpm },
      sfxCues: [],
    },
  });
};

const buildPrompt = (request: PlanRequest, recentPlans: MotionPlan[], validationFeedback?: string) => `
You are a world-class Motion Graphics Creative Director designing high-converting, vertical (1080x1920, 30fps) Remotion product promo videos.
Produce exactly one JSON object matching the JSON Schema.

CREATIVE DIRECTION RULES:
1. DYNAMIC, TOPIC-TAILORED STORYTELLING:
   - Select the optimal scene count (between 3 and 6 scenes) and total duration (~18s-30s) that best suits the product topic.
   - Do NOT follow a rigid, repetitive formula. Pick and order scene archetypes dynamically to fit the narrative:
     * code_diff: for code refactoring, bug fixes, type safety, API migrations, or framework upgrades.
     * card_reveal: for displaying feature cards, product benefits, modalities, or service pillars.
     * network_topology: for cloud architecture, microservices, zero-trust security, distributed databases, or API gateway flows.
     * stat_counter: for key numbers, benchmark speedups, percentage gains, or scale proof points.
     * quote: for user testimonials, executive statements, engineering philosophies, or partner endorsements.
     * list_build: for sequential steps, deployment pipelines, 3-step setups, or staged workflows.
     * typing_terminal: for developer tools, CLI utilities, shell commands, and verified execution logs.
     * before_after: for contrasting legacy headaches vs automated modern solutions.
     * kinetic_hook: for bold opening claim slams.
     * cta: for closing action and conversion.

2. THEME, BACKGROUND & ART DIRECTION:
   - Match palette colors to the subject matter (e.g. Claude terracotta/amber, Cyber neon emerald/cyan, Fintech gold/amber, AI violet/pink, Cloud sky/indigo, Minimal slate).
   - Choose a distinctive background:
     * "aurora": volumetric glowing noise mesh (ideal for AI, modern SaaS, consumer apps)
     * "grid": 3D perspective cyber tech grid (ideal for dev tools, terminal, cybersecurity, infrastructure)
     * "paper": warm editorial paper aesthetic (ideal for Claude, documentation, engineering blogs)
     * "gradient": vivid modern multi-stop mesh (ideal for creative tools, design, platforms)
     * "noise": deep obsidian starfield void (ideal for big data, financial telemetry, astrophysics)
   - Vary easing ("calm", "snappy", "cinematic") and motionIntensity ("low", "medium", "high").

3. SCENE CATALOG:
${JSON.stringify(SceneCatalog, null, 2)}

4. OUTPUT REQUIREMENTS:
   - meta.fps must be 30 and meta.size must be { width: 1080, height: 1920 }.
   - Ordered scenes with start time and duration (total video duration ~18-30s).
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
