import http from "http";
import fs from "fs";
import path from "path";
import { validateAndRender } from "./engine/runner";
import { CampaignData, MotionScene } from "./engine/schema";
import { askGemini } from "./engine/geminiDirector";
import { checkCodexAuth } from "./engine/codexAuth";
import { MotionJobQueue } from "./engine/jobQueue";

const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/(^['"]|['"]$)/g, "").trim();
    }
  }
}

const PORT = 4000;
const WORKSPACE_ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(__dirname, "../out");
const jobQueue = new MotionJobQueue(WORKSPACE_ROOT);
let codexAuth = checkCodexAuth();

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Convert natural text prompt or JSON into dynamic, topic-tailored campaign config
function parseUserPrompt(promptText: string, customConfig?: any): CampaignData {
  const p = promptText.toLowerCase();
  const campaignId = `video_${Date.now()}`;

  // Theme selection: UI choice or auto-detected
  const selectedTheme = customConfig?.theme || (
    p.includes("claude") ? "claude" :
    (p.includes("fintech") || p.includes("crypto") || p.includes("trade") || p.includes("payment")) ? "fintech" :
    (p.includes("cyber") || p.includes("security") || p.includes("ztna") || p.includes("vpn") || p.includes("hack")) ? "cyber" :
    "indigo"
  );

  let primaryColor = "#6366F1";
  let accentColor = "#EC4899";
  let name = "Modern SaaS";
  let bg = "#030712";

  if (selectedTheme === "claude") {
    primaryColor = "#D97757"; // warm clay
    accentColor = "#F5F1E8";  // cream
    name = "Claude Code";
    bg = "#1A1916";
  } else if (selectedTheme === "cyber") {
    primaryColor = "#10B981"; // emerald neon
    accentColor = "#06B6D4";  // cyan
    name = "Sentinel Cyber";
    bg = "#030712";
  } else if (selectedTheme === "fintech") {
    primaryColor = "#F59E0B"; // amber gold
    accentColor = "#10B981";  // emerald
    name = "FinPulse";
    bg = "#080C14";
  } else {
    primaryColor = "#6366F1"; // electric indigo
    accentColor = "#EC4899";  // pink
    name = "Nexa AI";
    bg = "#030712";
  }

  // Override colors if user specified custom
  if (customConfig?.primaryColor) primaryColor = customConfig.primaryColor;
  if (customConfig?.brandName) name = customConfig.brandName;

  // DYNAMIC SCENE CHOREOGRAPHY BASED ON TOPIC & INTENT
  const scenes: any[] = [];

  // Scene 1: Always start with a striking Hook or Title
  scenes.push({
    id: "s1",
    type: "kinetic_hook",
    tag: selectedTheme === "claude" ? "CLAUDE CODE" : "PROBLEM STATEMENT",
    headline: customConfig?.hookText || promptText.slice(0, 70) || "Legacy Systems Cannot Keep Up With Modern Velocity",
    accentWord: promptText.split(" ").slice(1, 3).join(" ") || "Legacy",
    subtitle: selectedTheme === "claude" ? "Autonomous execution across your entire codebase." : "Break bottlenecks with code-driven automation.",
    description: "Manual workflows create invisible latency, deployment friction, and unexpected regressions.",
    durationSeconds: 5,
  });

  // Scene 2: Check for Comparison / Migration intent
  if (p.includes("vs") || p.includes("compare") || p.includes("replace") || p.includes("legacy") || p.includes("migration")) {
    scenes.push({
      id: "s_compare",
      type: "before_after_split",
      tag: "BEFORE VS AFTER",
      headline: "Ditch The Legacy Architecture",
      accentWord: "Legacy",
      subtitle: "See the quantifiable difference in velocity and posture.",
      beforeAfter: {
        beforeTitle: "Legacy Approach",
        beforeItems: ["Manual Fragile Configuration", "Opaque Observability Blindspots", "Slow 45-Minute MTTR Incidents"],
        afterTitle: "Modern Automated Pipeline",
        afterItems: ["100% Code-Driven Execution", "Real-Time Telemetry & Health Checks", "Sub-Second Automatic Recovery"],
      },
      durationSeconds: 6,
    });
  }

  // Scene 3: Check for Terminal / Code / CLI / Agent intent
  if (p.includes("code") || p.includes("cli") || p.includes("terminal") || p.includes("agent") || p.includes("dev") || selectedTheme === "claude") {
    scenes.push({
      id: "s_term",
      type: "terminal_code",
      tag: "LIVE EXECUTION",
      headline: "Autonomous Verification In Seconds",
      accentWord: "Autonomous",
      terminalTitle: selectedTheme === "claude" ? "claude — refactor.sh" : "engine — deploy.sh",
      terminalCommand: selectedTheme === "claude"
        ? "claude review --strict --fix-memory-leaks --branch=prod"
        : `${name.toLowerCase().replace(/[^a-z]/g, "")} deploy --verify --production`,
      terminalOutput: "✔ AST parsed in 1.2s. 100% verification rules passing.",
      terminalAlert: "VERIFIED: Zero Regressions Detected",
      durationSeconds: 6,
    });
  }

  // Scene 4: Check for Network / Topology / Cloud / Security intent
  if (p.includes("network") || p.includes("cloud") || p.includes("mesh") || p.includes("security") || p.includes("ztna") || p.includes("api") || p.includes("infra")) {
    scenes.push({
      id: "s_topo",
      type: "network_topology",
      tag: "ARCHITECTURE TOPOLOGY",
      headline: "Direct End-To-End Connectivity",
      accentWord: "Connectivity",
      nodeLeft: { icon: "user", label: "Client Identity", status: "Passkey Verified", sub: "MFA Active" },
      nodeCenter: { icon: "shield", label: "Policy Mesh", sub: "Continuous Auth Engine", status: "ENFORCED" },
      nodeRight: { icon: "lock", label: "Cloud Workload", sub: "Zero WAN IP Exposure", status: "ISOLATED" },
      durationSeconds: 6,
    });
  }

  // Scene 5: Feature Cards (if scenes count is less than 3 so far)
  if (scenes.length < 3 || p.includes("feature") || p.includes("benefit") || p.includes("fast")) {
    scenes.push({
      id: "s_feat",
      type: "feature_cards",
      tag: "CORE CAPABILITIES",
      headline: "Built For Mission-Critical Scale",
      accentWord: "Scale",
      items: [
        { title: "Continuous Risk Telemetry", description: "Real-time posture and performance inspection.", badge: "REAL-TIME" },
        { title: "100% Code-Driven Engine", description: "Deterministic frame rendering without manual editing.", badge: "AUTOMATED" },
        { title: "Instant Multi-Format Output", description: "Native 9:16 vertical, 16:9 horizontal, and 1:1 square.", badge: "MULTI-FORMAT" },
      ],
      durationSeconds: 5,
    });
  }

  // Scene 6: Metric Counter (for performance, stats, roi)
  if (p.includes("metric") || p.includes("stat") || p.includes("percent") || p.includes("speed") || scenes.length < 4) {
    scenes.push({
      id: "s_metric",
      type: "metric_counter",
      tag: "PROVEN IMPACT",
      headline: "Measurable Production Velocity",
      accentWord: "Velocity",
      metricTarget: customConfig?.metricValue ? parseInt(customConfig.metricValue) || 95 : 95,
      metricSuffix: "%",
      metricLabel: "Efficiency & Latency Gain",
      secondaryMetricValue: "0ms",
      secondaryMetricLabel: "Manual Overhead Incurred",
      durationSeconds: 5,
    });
  }

  // Final Scene: Always end with conversion CTA
  scenes.push({
    id: "s_cta",
    type: "conversion_cta",
    tag: "GET STARTED",
    headline: "Deploy Your Next Experience Today",
    accentWord: "Today",
    ctaHeadline: customConfig?.ctaText || "Get Started Free →",
    trustBadges: selectedTheme === "claude"
      ? ["CLAUDE-POWERED", "ZERO RETENTION", "OPEN ECOSYSTEM"]
      : ["SOC 2 TYPE II AUDITED", "ZERO OVERHEAD", "DEPLOYS IN 5 MIN"],
    durationSeconds: 5,
  });

  return {
    campaignId,
    title: promptText.slice(0, 60) || "Motion Video",
    brand: {
      name,
      primaryColor,
      accentColor,
      backgroundColor: bg,
      theme: selectedTheme as any,
    },
    aspectRatio: (customConfig?.aspectRatio || "9:16") as "9:16" | "16:9" | "1:1",
    ctaText: customConfig?.ctaText || "Get Started Today →",
    audioTrack: "cyber_audio.wav",
    scenes,
  };
}

const server = http.createServer((req, res) => {
  // Serve static files from /out or /public
  if (req.url?.startsWith("/out/")) {
    const filePath = path.join(__dirname, "..", req.url);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const mimeTypes: Record<string, string> = {
        ".mp4": "video/mp4",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".json": "application/json",
      };
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  const jobFile = req.url?.match(/^\/jobs\/([a-zA-Z0-9_-]+)\/out\.mp4$/);
  if (jobFile) {
    const filePath = path.join(WORKSPACE_ROOT, "jobs", jobFile[1], "out.mp4");
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { "Content-Type": "video/mp4" });
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  if (req.method === "GET" && req.url === "/api/auth") {
    codexAuth = checkCodexAuth();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(codexAuth));
    return;
  }

  const jobStatus = req.url?.match(/^\/api\/jobs\/([a-zA-Z0-9_-]+)$/);
  if (req.method === "GET" && jobStatus) {
    const job = jobQueue.get(jobStatus[1]);
    if (!job) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Job not found" }));
      return;
    }
    const logPath = path.join(WORKSPACE_ROOT, "jobs", job.id, "log.txt");
    const logs = fs.existsSync(logPath) ? fs.readFileSync(logPath, "utf-8").slice(-5000) : "";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ...job, logs, videoUrl: job.status === "done" ? `/jobs/${job.id}/out.mp4` : undefined }));
    return;
  }

  const reRender = req.url?.match(/^\/api\/jobs\/([a-zA-Z0-9_-]+)\/rerender$/);
  if (req.method === "POST" && reRender) {
    try {
      const job = jobQueue.rerender(reRender[1]);
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(JSON.stringify(job));
    } catch (error) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/api/jobs") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      if (!codexAuth.loggedIn) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Codex is not connected. Run codex login, then refresh this page." }));
        return;
      }
      try {
        const payload = JSON.parse(body);
        const content = String(payload.content ?? payload.prompt ?? "").trim();
        if (!content) throw new Error("Content is required");
        const job = jobQueue.create(content, payload.options ?? payload.customConfig ?? {});
        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(JSON.stringify(job));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      }
    });
    return;
  }

  // Kept as a non-blocking compatibility alias for old callers. The legacy
  // renderer is intentionally no longer invoked from the web server.
  if (req.method === "POST" && req.url === "/api/render") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        if (!codexAuth.loggedIn) throw new Error("Codex is not connected. Run codex login, then refresh this page.");
        const content = String(payload.content ?? payload.prompt ?? "").trim();
        if (!content) throw new Error("Content is required");
        const job = jobQueue.create(content, payload.options ?? payload.customConfig ?? {});
        res.writeHead(202, { "Content-Type": "application/json" });
        res.end(JSON.stringify(job));
      } catch (err: any) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Serve UI Single Page Application
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Motion Studio AI - Dynamic Video Generator</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #080C16; color: #F8FAFC; }
    .glow { box-shadow: 0 0 35px rgba(99, 102, 241, 0.25); }
    .theme-active { border-color: #6366F1 !important; background-color: rgba(99, 102, 241, 0.2) !important; color: #FFFFFF !important; }
  </style>
</head>
<body class="min-h-screen p-6 md:p-12 font-sans flex flex-col justify-between">
  <div class="max-w-6xl mx-auto w-full">
    
    <!-- Header -->
    <header class="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
      <div>
        <div class="flex items-center gap-3">
          <span class="w-4 h-4 rounded-full bg-emerald-400 animate-pulse"></span>
          <h1 class="text-3xl font-black tracking-tight text-white">Motion Studio AI</h1>
        </div>
        <p class="text-slate-400 text-sm mt-1">Dynamic Storyboards • Multi-Theme Art Direction • 100% Deterministic Code</p>
      </div>
      <a href="http://localhost:3000" target="_blank" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg border border-slate-700 transition">
        Open Remotion Studio ↗
      </a>
    </header>

    <!-- Main Grid -->
    ${!codexAuth.loggedIn ? `<div class="mb-6 flex items-center justify-between gap-4 rounded-xl border border-amber-700/60 bg-amber-950/30 p-4 text-sm text-amber-100"><span><strong>Connect Codex</strong> — run <code>codex login</code> once in a terminal, then refresh this check. Credentials remain in ~/.codex.</span><button onclick="refreshCodexAuth()" class="shrink-0 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950">Check connection</button></div>` : ""}

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Prompt Input Panel (7 Cols) -->
      <div class="lg:col-span-7 bg-slate-900/60 p-6 md:p-8 rounded-2xl border border-slate-800 glow">
        
        <!-- Theme Selection (Unique Art Directions) -->
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">1. Choose Visual Art Direction / Theme</label>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <button type="button" onclick="setTheme('claude')" id="theme-claude" class="theme-btn border border-slate-800 bg-slate-950 text-slate-300 font-semibold py-2.5 px-3 rounded-xl text-xs text-left transition hover:border-slate-700">
            <span class="block text-orange-400 font-bold">🏛️ Claude Style</span>
            <span class="text-[10px] text-slate-500">Clay, Serif & Calm</span>
          </button>
          <button type="button" onclick="setTheme('cyber')" id="theme-cyber" class="theme-btn border border-slate-800 bg-slate-950 text-slate-300 font-semibold py-2.5 px-3 rounded-xl text-xs text-left transition hover:border-slate-700">
            <span class="block text-emerald-400 font-bold">🛡️ Cyber Neon</span>
            <span class="text-[10px] text-slate-500">Emerald & Dark Void</span>
          </button>
          <button type="button" onclick="setTheme('indigo')" id="theme-indigo" class="theme-btn theme-active border border-indigo-500 bg-indigo-500/20 text-white font-semibold py-2.5 px-3 rounded-xl text-xs text-left transition">
            <span class="block text-indigo-400 font-bold">⚡ Electric SaaS</span>
            <span class="text-[10px] text-slate-400">Violet & Neon Pink</span>
          </button>
          <button type="button" onclick="setTheme('fintech')" id="theme-fintech" class="theme-btn border border-slate-800 bg-slate-950 text-slate-300 font-semibold py-2.5 px-3 rounded-xl text-xs text-left transition hover:border-slate-700">
            <span class="block text-amber-400 font-bold">🪙 Fintech Gold</span>
            <span class="text-[10px] text-slate-500">Amber & Obsidian</span>
          </button>
        </div>

        <!-- Prompt Textarea -->
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">2. Enter Product Idea or Prompt</label>
        <textarea id="promptInput" rows="4" class="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-white text-base focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-500 transition" placeholder="e.g. Compare legacy manual code reviews vs autonomous AI refactoring. Highlight 85% review speedup and zero regressions."></textarea>

        <!-- Quick Aspect Ratio -->
        <div class="grid grid-cols-3 gap-3 mt-4">
          <button type="button" onclick="setRatio('9:16')" id="btn-9-16" class="ratio-btn border border-indigo-500 bg-indigo-500/20 text-white font-semibold py-2.5 rounded-xl text-sm transition">9:16 (Shorts/Reels)</button>
          <button type="button" onclick="setRatio('16:9')" id="btn-16-9" class="ratio-btn border border-slate-800 bg-slate-950 text-slate-400 font-semibold py-2.5 rounded-xl text-sm hover:border-slate-700 transition">16:9 (Landscape)</button>
          <button type="button" onclick="setRatio('1:1')" id="btn-1-1" class="ratio-btn border border-slate-800 bg-slate-950 text-slate-400 font-semibold py-2.5 rounded-xl text-sm hover:border-slate-700 transition">1:1 (Square)</button>
        </div>

        <!-- Advanced Customization -->
        <details class="mt-5 text-sm text-slate-400">
          <summary class="cursor-pointer hover:text-white transition font-medium">Fine-tune Brand Tokens & Copy (Optional)</summary>
          <div class="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800">
            <div>
              <label class="block text-xs text-slate-500 mb-1">Brand Name</label>
              <input id="brandName" type="text" placeholder="Auto-detected" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white">
            </div>
            <div>
              <label class="block text-xs text-slate-500 mb-1">Primary Color (Hex)</label>
              <input id="primaryColor" type="color" value="#6366F1" class="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
            </div>
            <div>
              <label class="block text-xs text-slate-500 mb-1">Key Metric (e.g. 98% / 10x)</label>
              <input id="metricValue" type="text" placeholder="98" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white">
            </div>
            <div>
              <label class="block text-xs text-slate-500 mb-1">Call to Action (CTA)</label>
              <input id="ctaText" type="text" placeholder="Get Started Free →" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white">
            </div>
          </div>
        </details>

        <!-- AGY CLI motion director banner -->
        <div class="mt-5 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>✦ AGY CLI Motion Director</span>
              <span class="text-[10px] text-emerald-400 font-semibold bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded-full">Active ⚡ (AGY CLI)</span>
            </label>
          </div>
          <p class="text-[10px] text-slate-400 mt-1">Autonomous planning via local AGY CLI. Generates Claude Code caliber typography, typing terminals & dynamic video-synced audio.</p>
        </div>


        <!-- Generate Button -->
        <button id="renderBtn" onclick="handleRender()" class="mt-5 w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition active:scale-[0.99]">
          <span id="btnText">Render Dynamic Motion Video 🚀</span>
          <svg id="spinner" class="animate-spin h-5 w-5 text-white hidden" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
        </button>

        <!-- Quick Presets -->
        <div class="mt-6 flex flex-wrap gap-2 text-xs text-slate-400">
          <span class="py-1">One-click presets:</span>
          <button onclick="setPreset('compare')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition">⚡ Before vs After Comparison</button>
          <button onclick="setPreset('claude')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition">🏛️ Claude Code Demo</button>
          <button onclick="setPreset('cyber')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition">🛡️ Zero Trust Security</button>
          <button onclick="setPreset('fintech')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition">🪙 Fintech Algo Trading</button>
        </div>
      </div>

      <!-- Preview Player & QC Output Panel (5 Cols) -->
      <div class="lg:col-span-5 bg-slate-900/60 p-6 md:p-8 rounded-2xl border border-slate-800 flex flex-col justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-300 mb-4 flex items-center justify-between">
            <span>Video Output Preview</span>
            <span id="statusBadge" class="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Ready</span>
          </h2>

          <div id="videoContainer" class="w-full bg-slate-950 rounded-xl border border-slate-800 aspect-video flex items-center justify-center overflow-hidden relative">
            <p id="placeholderText" class="text-sm text-slate-500 text-center px-4">
              Choose a theme, enter your prompt, and click Render to watch the motion graphics.
            </p>
            <video id="videoPlayer" class="w-full h-full object-contain hidden" controls autoplay loop playsinline></video>
          </div>

          <!-- QC Contact Sheet Preview -->
          <div id="contactContainer" class="mt-5 hidden">
            <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Automated QC Keyframes (Contact Sheet)</span>
              <a id="downloadContact" href="#" target="_blank" class="text-indigo-400 hover:underline">View Full ↗</a>
            </div>
            <img id="contactImg" class="w-full rounded-lg border border-slate-800" src="" alt="Contact sheet preview">
          </div>

          <pre id="jobLogs" class="mt-5 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-3 text-[10px] leading-relaxed text-slate-400"></pre>
        </div>

        <div id="downloadSection" class="mt-6 hidden">
          <a id="downloadBtn" href="#" download class="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 px-4 rounded-xl text-center block transition">
            Download MP4 Video ↓
          </a>
          <button id="rerenderBtn" onclick="rerenderSamePlan()" class="mt-3 w-full rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-bold text-slate-200 transition hover:bg-slate-700">
            Re-render with same plan
          </button>
        </div>
      </div>

    </div>
  </div>

  <footer class="text-center text-xs text-slate-600 mt-12">
    Powered by Remotion & FFmpeg • Deterministic Closed-Form Physics Engine • Zero Token Cost
  </footer>

  <script>
    let selectedRatio = '9:16';
    let currentTheme = 'indigo';
    let latestJobId = '';

    function setRatio(ratio) {
      selectedRatio = ratio;
      document.querySelectorAll('.ratio-btn').forEach(btn => {
        btn.classList.remove('border-indigo-500', 'bg-indigo-500/20', 'text-white');
        btn.classList.add('border-slate-800', 'bg-slate-950', 'text-slate-400');
      });
      const activeBtn = document.getElementById('btn-' + ratio.replace(':', '-'));
      activeBtn.classList.add('border-indigo-500', 'bg-indigo-500/20', 'text-white');
      activeBtn.classList.remove('border-slate-800', 'bg-slate-950', 'text-slate-400');
    }

    function setTheme(theme) {
      currentTheme = theme;
      document.querySelectorAll('.theme-btn').forEach(btn => btn.classList.remove('theme-active'));
      document.getElementById('theme-' + theme).classList.add('theme-active');
    }

    function setPreset(type) {
      const input = document.getElementById('promptInput');
      if (type === 'compare') {
        input.value = "Replace slow legacy VPNs with dynamic micro-tunnels. Compare manual firewall latency vs automated policy decisions. Highlight 98% attack surface reduction.";
        setTheme('cyber');
        setRatio('9:16');
      } else if (type === 'claude') {
        input.value = "Claude Code autonomous multi-file refactoring. Review pull requests, fix failing tests, and ship with 100% type-safe confidence.";
        setTheme('claude');
        setRatio('9:16');
      } else if (type === 'cyber') {
        input.value = "Zero Trust Network Access architecture. Protect cloud workloads from lateral breach. Continuous biometric authentication.";
        setTheme('cyber');
        setRatio('9:16');
      } else if (type === 'fintech') {
        input.value = "High-frequency algorithmic trading platform. Real-time portfolio risk telemetry with sub-millisecond order settlement.";
        setTheme('fintech');
        setRatio('9:16');
      }
    }

    async function handleRender() {
      const prompt = document.getElementById('promptInput').value.trim();
      if (!prompt) {
        alert("Please enter a prompt or choose a preset!");
        return;
      }

      const btn = document.getElementById('renderBtn');
      const btnText = document.getElementById('btnText');
      const spinner = document.getElementById('spinner');
      const statusBadge = document.getElementById('statusBadge');

      btn.disabled = true;
      btn.classList.add('opacity-75', 'cursor-not-allowed');
      btnText.innerText = "Rendering Video via Chromium...";
      spinner.classList.remove('hidden');
      statusBadge.innerText = "Rendering (30 fps)...";
      statusBadge.className = "text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded";

      const customConfig = {
        theme: currentTheme,
        aspectRatio: selectedRatio,
        brandName: document.getElementById('brandName').value || undefined,
        primaryColor: document.getElementById('primaryColor').value || undefined,
        metricValue: document.getElementById('metricValue').value || undefined,
        ctaText: document.getElementById('ctaText').value || undefined,
      };

      try {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: prompt, options: customConfig }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);
        await pollJob(data.id);
      } catch (err) {
        alert("Render failed: " + err.message);
        statusBadge.innerText = "Error";
        statusBadge.className = "text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded";
      } finally {
        btn.disabled = false;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
        btnText.innerText = "Render Dynamic Motion Video 🚀";
        spinner.classList.add('hidden');
      }
    }

    async function pollJob(id) {
      const btn = document.getElementById('renderBtn');
      const btnText = document.getElementById('btnText');
      const spinner = document.getElementById('spinner');
      const statusBadge = document.getElementById('statusBadge');
      const logs = document.getElementById('jobLogs');
      const res = await fetch('/api/jobs/' + id);
      const job = await res.json();
      if (job.error && !job.status) throw new Error(job.error);
      logs.textContent = job.logs || 'Waiting for job log…';
      statusBadge.innerText = job.status + (job.cacheHit ? ' • cache hit' : '');
      if (job.status === 'done') {
        const videoPlayer = document.getElementById('videoPlayer');
        const placeholder = document.getElementById('placeholderText');
        const downloadSection = document.getElementById('downloadSection');
        const downloadBtn = document.getElementById('downloadBtn');
        placeholder.classList.add('hidden');
        videoPlayer.classList.remove('hidden');
        videoPlayer.src = job.videoUrl;
        videoPlayer.play();
        latestJobId = job.id;
        downloadBtn.href = job.videoUrl;
        downloadSection.classList.remove('hidden');
        statusBadge.className = "text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded";
        btn.disabled = false;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
        btnText.innerText = "Render Dynamic Motion Video 🚀";
        spinner.classList.add('hidden');
        return;
      }
      if (job.status === 'failed') {
        throw new Error(job.error || 'Job failed');
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return pollJob(id);
    }

    async function rerenderSamePlan() {
      if (!latestJobId) return;
      const res = await fetch('/api/jobs/' + latestJobId + '/rerender', { method: 'POST' });
      const job = await res.json();
      if (job.error) return finishJobError(new Error(job.error));
      document.getElementById('renderBtn').disabled = true;
      document.getElementById('btnText').innerText = 'Re-rendering saved plan...';
      document.getElementById('spinner').classList.remove('hidden');
      pollJob(job.id).catch(finishJobError);
    }

    function finishJobError(err) {
      const btn = document.getElementById('renderBtn');
      const btnText = document.getElementById('btnText');
      const spinner = document.getElementById('spinner');
      const statusBadge = document.getElementById('statusBadge');
      alert("Render failed: " + err.message);
      statusBadge.innerText = "Error";
      statusBadge.className = "text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded";
      btn.disabled = false;
      btn.classList.remove('opacity-75', 'cursor-not-allowed');
      btnText.innerText = "Render Dynamic Motion Video 🚀";
      spinner.classList.add('hidden');
    }

    async function refreshCodexAuth() {
      const auth = await fetch('/api/auth').then((r) => r.json());
      if (auth.loggedIn) window.location.reload();
      else alert('Codex is still not connected. Run: codex login');
    }
  </script>
</body>
</html>`);
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🎬 Motion Studio Prompt-to-Video UI is Running!`);
  console.log(`👉 Open: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
