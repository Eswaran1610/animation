import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { MotionPlanJsonSchema, PlanSchema, SceneCatalog, campaignToMotionPlan, type MotionPlan, type PlanSceneType } from "./plan";
import { appendPlanHistory, describeRecentStyles, readRecentPlans } from "./planHistory";
import { askGemini } from "./geminiDirector";
import { type WebsiteBrief, researchWebsite, websiteBriefForPrompt } from "./websiteBrief";

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

export const extractTargetDuration = (content: string, options?: Record<string, unknown>): number => {
  if (typeof options?.duration === "number" && options.duration > 0) return options.duration;
  if (typeof options?.durationSeconds === "number" && options.durationSeconds > 0) return options.durationSeconds;
  if (typeof options?.seconds === "number" && options.seconds > 0) return options.seconds;
  if (typeof options?.duration === "string" && Number(options.duration) > 0) return Number(options.duration);

  const match = content.match(/(\d+)\s*(?:s\b|secs?\b|seconds?\b|-second\b)/i);
  if (match && Number(match[1]) > 0) {
    return Math.min(120, Math.max(10, Number(match[1])));
  }
  return 30;
};

export const normalizeSceneTimings = (scenes: MotionPlan["scenes"], targetDuration: number): MotionPlan["scenes"] => {
  if (!scenes || !scenes.length) return scenes;
  const currentTotal = scenes.reduce((sum, s) => sum + s.dur, 0);
  if (currentTotal <= 0) return scenes;

  const scale = targetDuration / currentTotal;
  let runningStart = 0;

  const adjusted = scenes.map((scene, idx) => {
    const isLast = idx === scenes.length - 1;
    let dur: number;
    if (isLast) {
      dur = Math.round((targetDuration - runningStart) * 10) / 10;
    } else {
      dur = Math.round(scene.dur * scale * 10) / 10;
    }
    dur = Math.max(2.0, dur);
    const start = Math.round(runningStart * 10) / 10;
    runningStart = Math.round((runningStart + dur) * 10) / 10;
    return {
      ...scene,
      start,
      dur,
    };
  });

  const last = adjusted[adjusted.length - 1];
  if (last) {
    const diff = Math.round((targetDuration - (last.start + last.dur)) * 10) / 10;
    last.dur = Math.max(2.0, Math.round((last.dur + diff) * 10) / 10);
  }

  return adjusted;
};

export const safeFallbackPlan = (
  content: string,
  options: Record<string, unknown> = {},
  websiteBrief?: WebsiteBrief
): MotionPlan => {
  const p = content.toLowerCase();
  const themeOpt = typeof options?.theme === "string" ? options.theme : "";
  const targetDuration = extractTargetDuration(content, options);

  const brief = (options?.websiteBrief as WebsiteBrief) ?? websiteBrief;

  const isClaude = p.includes("claude") || themeOpt === "claude";
  const isCyber = p.includes("cyber") || p.includes("security") || p.includes("vpn") || p.includes("rce") || p.includes("shield") || themeOpt === "cyber";
  const isFintech = p.includes("fintech") || p.includes("trade") || p.includes("trading") || p.includes("stock") || p.includes("payment") || themeOpt === "fintech";
  const isWeb3 = p.includes("web3") || p.includes("blockchain") || p.includes("nft") || p.includes("token") || p.includes("crypto") || p.includes("defi") || p.includes("dapp") || (brief?.url && /ink|crypto|chain|coin|token/i.test(brief.url));
  const isAI = p.includes("huggingface") || p.includes("model") || p.includes("weights") || p.includes("dataset") || p.includes("neural") || p.includes("llm") || p.includes("inference") || p.includes("deepseek");
  const isCloud = p.includes("cloud") || p.includes("docker") || p.includes("kubernetes") || p.includes("cluster") || p.includes("deploy") || p.includes("api") || p.includes("infra");

  const category = isClaude ? "claude" : isWeb3 ? "web3" : isCyber ? "cyber" : isFintech ? "fintech" : isAI ? "ai" : isCloud ? "cloud" : "saas";

  const hostSegment = brief?.url ? new URL(brief.url).hostname.replace(/^www\./i, "").split(".")[0] : "";
  const dynamicFallbackBrand = hostSegment ? hostSegment.charAt(0).toUpperCase() + hostSegment.slice(1) : "Brand";
  const brandName = brief?.brandName || (isClaude ? "Claude Code" : isCyber ? "Sentinel Cyber" : isFintech ? "FinPulse" : isWeb3 ? dynamicFallbackBrand : "Modern Studio");

  const cleanText = content.replace(/https?:\/\/[^\s]+/g, "").replace(/\b(?:visit|website|generate|motion|animation|\d+s)\b/gi, "").trim();
  const headline = truncate(
    brief?.tagline || cleanText || (isClaude ? "Claude Code Autonomous Engineering" : isWeb3 ? `${brandName}: Next-Gen Web3 Platform` : isAI ? "Open Machine Learning Intelligence" : isCyber ? "Autonomous Zero-Trust Defense" : isFintech ? "Sub-Millisecond Financial Velocity" : "Transform Your Workflow In Motion"),
    80
  );

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
    web3: {
      palette: { background: "#080C18", foreground: "#F8FAFC", primary: "#6366F1", accent: "#F59E0B", muted: "#94A3B8" },
      fonts: { heading: "Inter, sans-serif", body: "Inter, sans-serif", mono: "JetBrains Mono, monospace" },
      background: "noise",
      easing: "snappy",
      motionIntensity: "high",
      mood: "web3",
      bpm: 112,
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

  if (typeof options.primaryColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(options.primaryColor)) {
    chosenStyle.palette.primary = options.primaryColor;
  }

  type RawScene = { type: PlanSceneType; dur: number; content: Record<string, unknown> };
  let rawScenes: RawScene[] = [];

  if (brief && brief.products && brief.products.length > 0) {
    const p1 = brief.products[0];
    const p2 = brief.products[1] || p1;
    const p3 = brief.products[2] || p2;

    rawScenes = [
      {
        type: "kinetic_hook",
        dur: 6.0,
        content: {
          headline: `${brandName}: ${brief.tagline || "Decentralized Innovation"}`,
          eyebrow: `${brandName.toUpperCase()} ECOSYSTEM`,
          body: brief.description || "Building the next generation of decentralized Web3 experiences.",
          logo: brief.localLogo || brief.representativeImage,
        },
      },
      {
        type: "product_showcase",
        dur: 7.0,
        content: {
          headline: p1.title,
          eyebrow: "FEATURED INNOVATION",
          body: p1.description,
          image: p1.localImage || brief.localImages[0],
          tags: ["DECENTRALIZED", "PROVABLY FAIR", "ZERO OVERHEAD"],
        },
      },
      {
        type: "card_reveal",
        dur: 6.5,
        content: {
          headline: "Ecosystem Capabilities & Architecture",
          eyebrow: "CORE CAPABILITIES",
          items: brief.keyFeatures.length >= 3 ? brief.keyFeatures.slice(0, 3) : ["Decentralized Game Mechanics", "DeFi Staking & Yield", "On-Chain Security"],
          images: brief.localImages.slice(1, 4),
        },
      },
      {
        type: "product_showcase",
        dur: 7.0,
        content: {
          headline: p2.title,
          eyebrow: "ECOSYSTEM APPLICATION",
          body: p2.description,
          image: p2.localImage || brief.localImages[1] || brief.localImages[0],
          tags: ["PLAYER OWNERSHIP", "TOKENOMICS", "COMMUNITY DRIVEN"],
        },
      },
      {
        type: "before_after",
        dur: 6.5,
        content: {
          headline: "The Paradigm Shift: Centralized vs Web3",
          eyebrow: "TRANSFORMATION",
          before: ["Walled-garden centralized control", "Opaque in-game economies", "Unverifiable random outcomes"],
          after: ["Player asset sovereignty", "Mathematical blockchain transparency", "Instant cross-chain execution"],
        },
      },
      {
        type: "stat_counter",
        dur: 6.0,
        content: {
          headline: "Verified On-Chain Traction",
          eyebrow: "AUDITED BENCHMARKS",
          value: "100%",
          label: "Decentralized Transparency & Proof of Truth",
        },
      },
      {
        type: "product_showcase",
        dur: 7.0,
        content: {
          headline: p3.title,
          eyebrow: "NEXT-GEN PLATFORM",
          body: p3.description,
          image: p3.localImage || brief.localImages[2] || brief.localImages[0],
          tags: ["HIGH THROUGHPUT", "SMART CONTRACTS", "ON-CHAIN VERIFIED"],
        },
      },
      {
        type: "quote",
        dur: 6.5,
        content: {
          headline: "Engineering Philosophy",
          eyebrow: "CORE VISION",
          quote: brief.verifiedFacts[0] || (brief.keyFeatures[1] || "Building the open, decentralized infrastructure for modern gaming and finance."),
          attribution: `${brandName} Core Architecture`,
        },
      },
      {
        type: "cta",
        dur: 7.5,
        content: {
          headline: `Join The ${brandName} Ecosystem Today`,
          eyebrow: "GET STARTED",
          cta: "Launch Platform & Connect →",
          logo: brief.localLogo || brief.representativeImage,
        },
      },
    ];
  } else if (category === "ai") {
    rawScenes = [
      {
        type: "kinetic_hook",
        dur: 6.0,
        content: { headline, eyebrow: "OPEN AI ECOSYSTEM", body: "Accelerate discovery, training, and inference on one open platform." },
      },
      {
        type: "card_reveal",
        dur: 7.0,
        content: {
          headline: "Unified Foundation Infrastructure",
          eyebrow: "ALL MODALITIES",
          items: ["2M+ Open Weight Models", "500k+ Clean Multimodal Datasets", "Serverless GPU Inference Endpoints"],
          body: "Scale from experimentation to distributed production in one click.",
        },
      },
      {
        type: "typing_terminal",
        dur: 7.0,
        content: {
          headline: "Zero-Latency Cloud Model Serving",
          eyebrow: "INFERENCE RUNTIME",
          command: "hf-cli deploy --model=deepseek-v3 --quant=fp8 --gpu=h100",
          output: "✔ Cluster warm in 1.4s. 4,200 tok/s throughput verified.",
        },
      },
      {
        type: "stat_counter",
        dur: 6.5,
        content: { headline: "Enterprise Scale & Adoption", eyebrow: "VERIFIED TRACTION", value: "400K+", label: "Organizations Building On Open Weights" },
      },
      {
        type: "before_after",
        dur: 6.5,
        content: {
          headline: "Proprietary Lock-In vs Sovereign AI",
          eyebrow: "BEFORE VS AFTER",
          before: ["Opaque closed APIs", "Uncontrollable data residency", "Fragile vendor lock-in"],
          after: ["100% Sovereign weights", "Private air-gapped VPCs", "Unrestricted fine-tuning"],
        },
      },
      {
        type: "quote",
        dur: 6.0,
        content: { headline: "Production Intelligence", quote: "The global epicenter of machine learning collaboration and reproducible science.", attribution: "Frontier AI Consortium" },
      },
      {
        type: "cta",
        dur: 7.0,
        content: { headline: "Build With Open Models Today", eyebrow: "ZERO LOCK-IN", cta: "Explore Models & Spaces →" },
      },
    ];
  } else if (category === "cyber") {
    rawScenes = [
      {
        type: "kinetic_hook",
        dur: 6.0,
        content: { headline, eyebrow: "ZERO TRUST POSTURE", body: "Continuous biometric verification and microsegmentation for modern clouds." },
      },
      {
        type: "network_topology",
        dur: 7.0,
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
        dur: 7.0,
        content: {
          headline: "Eliminate Lateral Breach Exposure",
          eyebrow: "BEFORE VS AFTER",
          before: ["Open internal WANs", "Static VPN credentials", "Blindspot lateral movement"],
          after: ["Dynamic micro-tunnels", "Ephemerally signed mTLS", "Zero lateral attack surface"],
        },
      },
      {
        type: "typing_terminal",
        dur: 7.0,
        content: {
          headline: "Instant Cryptographic Attestation",
          eyebrow: "POLICY ENFORCEMENT",
          command: "sentinel verify --identity=device.cert --workload=k8s-prod",
          output: "✔ mTLS Handshake 0.8ms. Zero WAN IP exposed. Packet verified.",
        },
      },
      {
        type: "stat_counter",
        dur: 6.5,
        content: { headline: "Measurable Threat Neutralization", eyebrow: "AUDITED IMPACT", value: "0", label: "Uncontained CVE Exploitations Detected" },
      },
      {
        type: "quote",
        dur: 6.0,
        content: { headline: "Zero Overhead Security", quote: "We replaced 3 legacy VPNs and stopped lateral attacks before packets reached workloads.", attribution: "CISO, Cloud Native Financial" },
      },
      {
        type: "cta",
        dur: 7.5,
        content: { headline: "Deploy Zero Trust Architecture", eyebrow: "5 MINUTE ENROLLMENT", cta: "Get Started Free →" },
      },
    ];
  } else if (category === "fintech") {
    rawScenes = [
      {
        type: "kinetic_hook",
        dur: 6.0,
        content: { headline, eyebrow: "INSTANT LIQUIDITY", body: "Ultra-low latency portfolio telemetry with real-time risk settlement." },
      },
      {
        type: "stat_counter",
        dur: 6.5,
        content: { headline: "Sub-Millisecond Execution Speed", eyebrow: "BENCHMARK PERFORMANCE", value: "0.2ms", label: "Average Atomic Clearing & Settlement Latency" },
      },
      {
        type: "card_reveal",
        dur: 7.0,
        content: {
          headline: "Engineered For Sovereign Velocity",
          eyebrow: "CORE ADVANTAGES",
          items: ["Continuous Risk Telemetry", "Cross-Exchange Arbitrage Router", "100% Deterministic Accounting"],
        },
      },
      {
        type: "list_build",
        dur: 7.0,
        content: {
          headline: "Three-Stage Transaction Pipeline",
          eyebrow: "EXECUTION PHASES",
          items: ["Ingest global order book depth", "Run sub-microsecond risk checks", "Execute zero-slippage settlement"],
        },
      },
      {
        type: "before_after",
        dur: 6.5,
        content: {
          headline: "From Legacy T+2 to Atomic Real-Time",
          eyebrow: "SETTLEMENT REVOLUTION",
          before: ["Multi-day clearing latency", "Capital lockup risk", "Opaque reconciliation"],
          after: ["Instant cryptographic finality", "Continuous real-time margin", "100% Auditable ledger"],
        },
      },
      {
        type: "quote",
        dur: 6.0,
        content: { headline: "Institutional Velocity", quote: "Settlement friction vanished. Capital efficiency increased by 40% in our first month.", attribution: "Head of Trading, Nexus Alpha" },
      },
      {
        type: "cta",
        dur: 7.0,
        content: { headline: "Power Your Trading Infrastructure", eyebrow: "SOC-2 CERTIFIED", cta: "Access Sandbox API →" },
      },
    ];
  } else if (category === "claude") {
    rawScenes = [
      {
        type: "kinetic_hook",
        dur: 6.0,
        content: { headline, eyebrow: "CLAUDE CODE CLI", body: "Autonomous engineering across your terminal with mathematical certainty." },
      },
      {
        type: "typing_terminal",
        dur: 7.5,
        content: {
          headline: "Refactor Large Codebases Intelligently",
          eyebrow: "LIVE TERMINAL RUNTIME",
          command: "claude review --strict --fix-type-errors src/auth.ts",
          output: "✔ AST parsed in 0.4s. 3 regressions repaired. 100% TypeScript verified.",
        },
      },
      {
        type: "code_diff",
        dur: 6.5,
        content: {
          headline: "Zero-Regression Code Evolution",
          eyebrow: "BEFORE VS AFTER",
          before: "const user = req.body; // Unchecked raw payload",
          after: "const user = UserSchema.parse(req.body); // 100% type safe",
        },
      },
      {
        type: "card_reveal",
        dur: 6.5,
        content: {
          headline: "Autonomous Software Engineering",
          eyebrow: "CAPABILITIES",
          items: ["Semantic AST Code Editing", "Automated Regression Tests", "Continuous PR Code Review"],
        },
      },
      {
        type: "stat_counter",
        dur: 6.0,
        content: { headline: "Engineering Cycle Acceleration", eyebrow: "MEASURED IMPACT", value: "85%", label: "Reduction In Pull Request Review Latency" },
      },
      {
        type: "quote",
        dur: 6.0,
        content: { headline: "Developer Flow", quote: "Claude Code lets engineers focus on design while it handles type safety and migrations.", attribution: "Engineering Lead, Anthropic" },
      },
      {
        type: "cta",
        dur: 7.5,
        content: { headline: "Experience Claude Code CLI", eyebrow: "LOCAL & AUTONOMOUS", cta: "claude.ai/code →" },
      },
    ];
  } else {
    rawScenes = [
      {
        type: "kinetic_hook",
        dur: 6.0,
        content: { headline, eyebrow: "PRODUCT SHOWCASE", body: "Transforming how high-performing teams build and deliver modern software." },
      },
      {
        type: "card_reveal",
        dur: 7.0,
        content: {
          headline: "Designed For Unmatched Productivity",
          eyebrow: "KEY CAPABILITIES",
          items: ["Instant Real-Time Collaboration", "Code-Driven Deterministic Exports", "Multi-Platform Automated Sync"],
        },
      },
      {
        type: "before_after",
        dur: 7.0,
        content: {
          headline: "From Friction To Autonomous Velocity",
          eyebrow: "TRANSFORMATION",
          before: ["Manual fragmented tools", "Slow iterative cycles"],
          after: ["Unified modern engine", "Sub-second verified output"],
        },
      },
      {
        type: "stat_counter",
        dur: 6.5,
        content: { headline: "Proven Production Acceleration", eyebrow: "METRIC PROOF", value: "10x", label: "Faster Delivery Cycle vs Traditional Workflows" },
      },
      {
        type: "quote",
        dur: 6.0,
        content: { headline: "Customer Proof", quote: "The fastest, most reliable engine we have ever adopted for our production pipeline.", attribution: "VP of Product, Modern Tech" },
      },
      {
        type: "cta",
        dur: 7.5,
        content: { headline: "Launch Your Next Project Today", eyebrow: "GET STARTED NOW", cta: "Start Free Trial →" },
      },
    ];
  }

  // Calculate chronological starts without overlaps and normalize to exact targetDuration
  let currentStart = 0;
  const initialScenes = rawScenes.map((s, idx) => {
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

  const normalizedScenes = normalizeSceneTimings(initialScenes, targetDuration);

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
    scenes: normalizedScenes,
    audio: {
      bed: { mood: chosenStyle.mood, bpm: chosenStyle.bpm },
      sfxCues: [],
    },
  });
};

const buildPrompt = (
  request: PlanRequest,
  recentPlans: MotionPlan[],
  targetDuration: number,
  websiteBrief?: WebsiteBrief,
  validationFeedback?: string
) => {
  const briefPromptSection = websiteBrief
    ? `
CRITICAL VERIFIED WEBSITE RESEARCH (USE THIS FACTUAL DATA ONLY - DO NOT HALLUCINATE):
${websiteBriefForPrompt(websiteBrief)}

STRICT ANTI-HALLUCINATION & ASSET INTEGRATION MANDATE:
1. Brand: Use the exact brand name '${websiteBrief.brandName}'.
2. Products & Visuals: You MUST feature the verified products (${websiteBrief.products.map((p) => p.title).join(", ")}).
3. Product Showcase: Use the 'product_showcase' scene archetype for key products, and set 'content.image' to the product's localImage path (e.g., '${websiteBrief.products[0]?.localImage || websiteBrief.localImages[0]}').
4. Brand Logo: Set 'content.logo' to '${websiteBrief.localLogo || websiteBrief.representativeImage}'.
5. Key Features: Use the verified features in 'card_reveal' or 'list_build' scenes.
6. DO NOT invent fictitious industries (e.g., dermatology, beauty clinics, or generic corporate filler).
`
    : "";

  const minScenes = Math.max(4, Math.round(targetDuration / 7));
  const maxScenes = Math.max(minScenes + 1, Math.round(targetDuration / 4));

  return `
You are a world-class Motion Graphics Creative Director designing high-converting, vertical (1080x1920, 30fps) Remotion product promo videos.
Produce exactly one JSON object matching the JSON Schema.

CRITICAL TIMING REQUIREMENTS:
- TARGET TOTAL DURATION: EXACTLY ${targetDuration} SECONDS (${targetDuration * 30} total frames at 30 fps).
- SCENE COUNT: Target between ${minScenes} and ${maxScenes} scenes.
- SCENE START TIMESTAMPS: Scene 1 starts at 0. Scene N starts at (Start_{N-1} + Dur_{N-1}).
- THE SUM OF ALL SCENE DURATIONS (dur) MUST SUM UP TO EXACTLY ${targetDuration} SECONDS.
${briefPromptSection}
CREATIVE DIRECTION RULES:
1. DYNAMIC, TOPIC-TAILORED STORYTELLING:
   - Pick and order scene archetypes dynamically to fit the narrative:
     * product_showcase: hero visual media / screenshot card for real products with image asset.
     * kinetic_hook: bold opening claim slam with brand logo.
     * card_reveal: feature cards, product benefits, modalities, or service pillars.
     * before_after: contrasting legacy headaches vs automated modern solutions.
     * stat_counter: key metrics, benchmark speedups, or scale proof points.
     * typing_terminal: developer tools, CLI utilities, shell commands, and verified execution logs.
     * code_diff: code refactoring, bug fixes, type safety, or framework upgrades.
     * quote: user testimonials or engineering philosophy statements.
     * list_build: sequential steps or deployment pipelines.
     * network_topology: cloud architecture, microservices, or zero-trust security flows.
     * cta: closing action and conversion.

2. THEME, BACKGROUND & ART DIRECTION:
   - Match palette colors to the subject matter.
   - Choose a distinctive background: "aurora", "grid", "paper", "gradient", or "noise".
   - Vary easing ("calm", "snappy", "cinematic") and motionIntensity ("low", "medium", "high").

3. SCENE CATALOG:
${JSON.stringify(SceneCatalog, null, 2)}

4. OUTPUT REQUIREMENTS:
   - meta.fps must be 30 and meta.size must be { width: 1080, height: 1920 }.
   - Ordered scenes with start time and duration (total video duration exactly ${targetDuration}s).
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
};

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
  const targetDuration = extractTargetDuration(request.content, request.options);
  const websiteBrief = request.options?.websiteBrief as WebsiteBrief | undefined;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "motion-plan-"));
  const schemaPath = path.join(tempDir, "motion-plan.schema.json");
  const outputPath = path.join(tempDir, "plan.json");
  const errors: string[] = [];

  try {
    await fs.writeFile(schemaPath, JSON.stringify(codexOutputSchema(), null, 2));
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const raw = await runner({
          prompt: buildPrompt(request, recentPlans, targetDuration, websiteBrief, errors.at(-1)),
          schemaPath,
          outputPath,
          workspaceRoot,
        });
        let plan = validatePlan(raw);
        plan.scenes = normalizeSceneTimings(plan.scenes, targetDuration);
        plan = PlanSchema.parse(plan);
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
      let plan = campaignToMotionPlan(geminiCampaign);
      plan.scenes = normalizeSceneTimings(plan.scenes, targetDuration);
      plan = PlanSchema.parse(plan);
      return { plan, source: "gemini", attempts: MAX_ATTEMPTS, errors };
    }
  } catch (error) {
    errors.push(`Gemini fallback: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Tier 3 Fallback: Context-aware dynamic fallback
  let fallback = safeFallbackPlan(request.content, request.options, websiteBrief);
  fallback.scenes = normalizeSceneTimings(fallback.scenes, targetDuration);
  fallback = PlanSchema.parse(fallback);
  return { plan: fallback, source: "fallback", attempts: MAX_ATTEMPTS, errors };
};
