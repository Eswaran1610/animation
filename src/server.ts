import http from "http";
import fs from "fs";
import path from "path";
import { validateAndRender } from "./engine/runner";
import { CampaignData, MotionScene } from "./engine/schema";
import { askGemini } from "./engine/geminiDirector";
import {
  createJob,
  getJob,
  listJobs,
  cancelJob,
  VideoJob,
} from "./jobs/jobStore";
import { orchestrateJob } from "./jobs/orchestrator";
import { orchestrateClaimLinkedJob } from "./jobs/pipelineOrchestrator";
import { codexAvailable } from "./ai/codexCli";
import { OUTPUT_DIR } from "./render/videoPipeline";

// ── Load .env ─────────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/(^['"]|['"]$)/g, "").trim();
    }
  }
}

const PORT = 4000;
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function jsonResponse(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function safeJobView(job: VideoJob) {
  // Never expose geminiApiKey or other secrets in API responses
  const { settings, ...rest } = job;
  const { geminiApiKey: _dropped, ...safeSettings } = settings;
  return { ...rest, settings: safeSettings };
}

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

// ── Legacy prompt parser (preserved) ─────────────────────────────────────────
function parseUserPrompt(promptText: string, customConfig?: any): CampaignData {
  const p = promptText.toLowerCase();
  const campaignId = `video_${Date.now()}`;

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

  if (selectedTheme === "claude") { primaryColor = "#D97757"; accentColor = "#F5F1E8"; name = "Claude Code"; bg = "#1A1916"; }
  else if (selectedTheme === "cyber") { primaryColor = "#10B981"; accentColor = "#06B6D4"; name = "Sentinel Cyber"; bg = "#030712"; }
  else if (selectedTheme === "fintech") { primaryColor = "#F59E0B"; accentColor = "#10B981"; name = "FinPulse"; bg = "#080C14"; }
  else { primaryColor = "#6366F1"; accentColor = "#EC4899"; name = "Nexa AI"; bg = "#030712"; }

  if (customConfig?.primaryColor) primaryColor = customConfig.primaryColor;
  if (customConfig?.brandName) name = customConfig.brandName;

  const scenes: any[] = [];

  scenes.push({
    id: "s1", type: "kinetic_hook", tag: selectedTheme === "claude" ? "CLAUDE CODE" : "PROBLEM STATEMENT",
    headline: customConfig?.hookText || promptText.slice(0, 70) || "Legacy Systems Cannot Keep Up With Modern Velocity",
    accentWord: promptText.split(" ").slice(1, 3).join(" ") || "Legacy",
    subtitle: selectedTheme === "claude" ? "Autonomous execution across your entire codebase." : "Break bottlenecks with code-driven automation.",
    description: "Manual workflows create invisible latency, deployment friction, and unexpected regressions.",
    durationSeconds: 5,
  });

  if (p.includes("vs") || p.includes("compare") || p.includes("replace") || p.includes("legacy") || p.includes("migration")) {
    scenes.push({
      id: "s_compare", type: "before_after_split", tag: "BEFORE VS AFTER",
      headline: "Ditch The Legacy Architecture", accentWord: "Legacy",
      subtitle: "See the quantifiable difference in velocity and posture.",
      beforeAfter: {
        beforeTitle: "Legacy Approach", beforeItems: ["Manual Fragile Configuration", "Opaque Observability Blindspots", "Slow 45-Minute MTTR Incidents"],
        afterTitle: "Modern Automated Pipeline", afterItems: ["100% Code-Driven Execution", "Real-Time Telemetry & Health Checks", "Sub-Second Automatic Recovery"],
      },
      durationSeconds: 6,
    });
  }

  if (p.includes("code") || p.includes("cli") || p.includes("terminal") || p.includes("agent") || p.includes("dev") || selectedTheme === "claude") {
    scenes.push({
      id: "s_term", type: "terminal_code", tag: "LIVE EXECUTION",
      headline: "Autonomous Verification In Seconds", accentWord: "Autonomous",
      terminalTitle: selectedTheme === "claude" ? "claude — refactor.sh" : "engine — deploy.sh",
      terminalCommand: selectedTheme === "claude" ? "claude review --strict --fix-memory-leaks --branch=prod" : `${name.toLowerCase().replace(/[^a-z]/g, "")} deploy --verify --production`,
      terminalOutput: "✔ AST parsed in 1.2s. 100% verification rules passing.",
      terminalAlert: "VERIFIED: Zero Regressions Detected",
      durationSeconds: 6,
    });
  }

  if (p.includes("network") || p.includes("cloud") || p.includes("mesh") || p.includes("security") || p.includes("ztna") || p.includes("api") || p.includes("infra")) {
    scenes.push({
      id: "s_topo", type: "network_topology", tag: "ARCHITECTURE TOPOLOGY",
      headline: "Direct End-To-End Connectivity", accentWord: "Connectivity",
      nodeLeft: { icon: "user", label: "Client Identity", status: "Passkey Verified", sub: "MFA Active" },
      nodeCenter: { icon: "shield", label: "Policy Mesh", sub: "Continuous Auth Engine", status: "ENFORCED" },
      nodeRight: { icon: "lock", label: "Cloud Workload", sub: "Zero WAN IP Exposure", status: "ISOLATED" },
      durationSeconds: 6,
    });
  }

  if (scenes.length < 3 || p.includes("feature") || p.includes("benefit") || p.includes("fast")) {
    scenes.push({
      id: "s_feat", type: "feature_cards", tag: "CORE CAPABILITIES",
      headline: "Built For Mission-Critical Scale", accentWord: "Scale",
      items: [
        { title: "Continuous Risk Telemetry", description: "Real-time posture and performance inspection.", badge: "REAL-TIME" },
        { title: "100% Code-Driven Engine", description: "Deterministic frame rendering without manual editing.", badge: "AUTOMATED" },
        { title: "Instant Multi-Format Output", description: "Native 9:16 vertical, 16:9 horizontal, and 1:1 square.", badge: "MULTI-FORMAT" },
      ],
      durationSeconds: 5,
    });
  }

  if (p.includes("metric") || p.includes("stat") || p.includes("percent") || p.includes("speed") || scenes.length < 4) {
    scenes.push({
      id: "s_metric", type: "metric_counter", tag: "PROVEN IMPACT",
      headline: "Measurable Production Velocity", accentWord: "Velocity",
      metricTarget: customConfig?.metricValue ? parseInt(customConfig.metricValue) || 95 : 95,
      metricSuffix: "%", metricLabel: "Efficiency & Latency Gain",
      secondaryMetricValue: "0ms", secondaryMetricLabel: "Manual Overhead Incurred",
      durationSeconds: 5,
    });
  }

  scenes.push({
    id: "s_cta", type: "conversion_cta", tag: "GET STARTED",
    headline: "Deploy Your Next Experience Today", accentWord: "Today",
    ctaHeadline: customConfig?.ctaText || "Get Started Free →",
    trustBadges: selectedTheme === "claude"
      ? ["CLAUDE-POWERED", "ZERO RETENTION", "OPEN ECOSYSTEM"]
      : ["SOC 2 TYPE II AUDITED", "ZERO OVERHEAD", "DEPLOYS IN 5 MIN"],
    durationSeconds: 5,
  });

  return {
    campaignId, title: promptText.slice(0, 60) || "Motion Video",
    brand: { name, primaryColor, accentColor, backgroundColor: bg, theme: selectedTheme as any },
    aspectRatio: (customConfig?.aspectRatio || "9:16") as "9:16" | "16:9" | "1:1",
    fps: customConfig?.fps === 30 ? 30 : 60,
    ctaText: customConfig?.ctaText || "Get Started Today →",
    audioTrack: "cyber_audio.wav",
    scenes,
  };
}

// ── HTTP server ────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = req.url || "/";
  const method = req.method || "GET";

  // ── CORS preflight ──────────────────────────────────────────────────────────
  if (method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,DELETE", "Access-Control-Allow-Headers": "Content-Type" });
    res.end();
    return;
  }

  // ── Static file: /out/** ────────────────────────────────────────────────────
  if (url.startsWith("/out/")) {
    const filePath = path.join(__dirname, "..", url);
    // Prevent path traversal
    const outDir = path.resolve(OUTPUT_DIR);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(outDir)) {
      jsonResponse(res, 403, { error: "Forbidden" });
      return;
    }
    if (fs.existsSync(resolved)) {
      const ext = path.extname(resolved);
      const mimeTypes: Record<string, string> = {
        ".mp4": "video/mp4", ".png": "image/png",
        ".jpg": "image/jpeg", ".json": "application/json",
        ".mp3": "audio/mpeg", ".wav": "audio/wav",
      };
      res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
      return fs.createReadStream(resolved).pipe(res);
    }
    jsonResponse(res, 404, { error: "File not found" });
    return;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // ── NEW JOB API ──────────────────────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════════════════

  // POST /api/jobs — create a new research-to-render job
  if (method === "POST" && url === "/api/jobs") {
    try {
      const body = await parseBody(req);
      const { instructions, topic, settings } = body;

      const finalInstructions = instructions || topic || "";
      if (!finalInstructions || finalInstructions.trim().length < 3) {
        jsonResponse(res, 400, { error: "instructions must be at least 3 characters." });
        return;
      }

      const jobSettings: VideoJob["settings"] = {
        topic: topic || finalInstructions.slice(0, 100),
        targetDurationSeconds: Math.max(30, Math.min(300, settings?.targetDurationSeconds || 60)),
        fps: settings?.fps === 30 ? 30 : 60,
        aspectRatio: ["9:16", "16:9", "1:1"].includes(settings?.aspectRatio) ? settings.aspectRatio : "9:16",
        theme: settings?.theme || "cyber",
        audience: settings?.audience || "Technical viewers",
        style: settings?.style || "calm and clear cinematic technical motion graphics",
        pipelineMode: settings?.pipelineMode === "legacy" ? "legacy" : settings?.pipelineMode === "claim-linked" ? "claim-linked" : "codex-local",
        geminiApiKey: settings?.geminiApiKey || undefined,
      };

      const job = createJob(finalInstructions.trim(), jobSettings);

      // Kick off async pipeline (non-blocking)
      const runner = jobSettings.pipelineMode === "legacy" ? orchestrateJob : orchestrateClaimLinkedJob;
      runner(job).catch((err) => {
        console.error(`[Server] Unhandled orchestrator error for ${job.id}:`, err);
      });

      jsonResponse(res, 202, { job: safeJobView(job) });
    } catch (err: any) {
      jsonResponse(res, 400, { error: err.message });
    }
    return;
  }

  // GET /api/jobs — list all jobs
  if (method === "GET" && url === "/api/jobs") {
    const jobs = listJobs().map(safeJobView);
    jsonResponse(res, 200, { jobs });
    return;
  }

  // GET /api/jobs/:id — get a single job
  const jobMatch = url.match(/^\/api\/jobs\/([^\/]+)$/);
  if (method === "GET" && jobMatch) {
    const job = getJob(jobMatch[1]);
    if (!job) { jsonResponse(res, 404, { error: "Job not found" }); return; }
    jsonResponse(res, 200, { job: safeJobView(job) });
    return;
  }

  // DELETE /api/jobs/:id — cancel a job
  const cancelMatch = url.match(/^\/api\/jobs\/([^\/]+)\/cancel$/);
  if (method === "POST" && cancelMatch) {
    try {
      const job = cancelJob(cancelMatch[1]);
      jsonResponse(res, 200, { job: safeJobView(job) });
    } catch (err: any) {
      jsonResponse(res, 400, { error: err.message });
    }
    return;
  }

  // GET /api/status — health check + env capability report
  if (method === "GET" && url === "/api/status") {
    jsonResponse(res, 200, {
      status: "ok",
      capabilities: {
        gemini: !!(process.env.GEMINI_API_KEY),
        openai: !!(process.env.OPENAI_API_KEY),
        codex: codexAvailable(),
        research: {
          tavily: !!(process.env.TAVILY_API_KEY),
          serpapi: !!(process.env.SERPAPI_KEY),
          brave: !!(process.env.BRAVE_SEARCH_API_KEY),
          geminiGrounding: !!(process.env.GEMINI_API_KEY),
          duckduckgo: true,
        },
        tts: {
          elevenlabs: !!(process.env.ELEVENLABS_API_KEY),
          openai: !!(process.env.OPENAI_API_KEY),
        },
        anthropic: !!(process.env.ANTHROPIC_API_KEY),
      },
    });
    return;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // ── LEGACY SYNC RENDER API (preserved for backward compatibility) ────────────
  // ═════════════════════════════════════════════════════════════════════════════
  if (method === "POST" && url === "/api/render") {
    try {
      const payload = await parseBody(req);
      let campaignData: CampaignData | null = null;

      const geminiKey = payload.geminiApiKey || process.env.GEMINI_API_KEY;
      if (geminiKey && geminiKey.trim().length > 10) {
        console.log(`[UI Render] Consulting Gemini AI Creative Director for prompt: "${payload.prompt?.slice(0, 50)}..."`);
        campaignData = await askGemini(payload.prompt || "", geminiKey);
        if (campaignData) {
          console.log(`[UI Render] Gemini successfully generated custom motion script with ${campaignData.scenes.length} scenes.`);
        }
      }

      if (!campaignData) {
        campaignData = parseUserPrompt(payload.prompt || "", payload.customConfig);
      }

      console.log(`[UI Render] Starting studio render for ${campaignData.campaignId} (Theme: ${campaignData.brand.theme || "cyber"})...`);
      const { videoOut, contactOut, campaignJsonPath } = validateAndRender(campaignData);

      console.log(`[UI Render] Render complete: ${videoOut}`);
      jsonResponse(res, 200, {
        success: true,
        videoUrl: `/out/${path.basename(videoOut)}`,
        contactUrl: `/out/${path.basename(contactOut)}`,
        config: campaignData,
      });
    } catch (err: any) {
      console.error("UI Render failed:", err);
      jsonResponse(res, 500, { error: err.message });
    }
    return;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // ── DASHBOARD UI ─────────────────────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════════════════
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(getDashboardHTML());
});

function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Motion Studio AI - Research-to-Video Generator</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #080C16; color: #F8FAFC; font-family: system-ui, sans-serif; }
    .glow { box-shadow: 0 0 35px rgba(99, 102, 241, 0.25); }
    .theme-active { border-color: #6366F1 !important; background-color: rgba(99, 102, 241, 0.2) !important; color: #FFFFFF !important; }
    .stage-done { color: #34D399; }
    .stage-active { color: #FBBF24; }
    .stage-pending { color: #475569; }
    .progress-bar { transition: width 0.5s ease; }
    @keyframes pulse-ring { 0%,100%{opacity:1} 50%{opacity:0.5} }
    .pulse-ring { animation: pulse-ring 1.5s ease-in-out infinite; }
    .source-card { background: rgba(15,23,42,0.8); border: 1px solid #1e293b; border-radius: 8px; padding: 10px 14px; }
    .job-card { transition: all 0.2s; cursor: pointer; }
    .job-card:hover { border-color: #334155 !important; }
    .job-card.selected { border-color: #6366F1 !important; background: rgba(99,102,241,0.08) !important; }
  </style>
</head>
<body class="min-h-screen p-6 md:p-10 flex flex-col">
  <div class="max-w-7xl mx-auto w-full flex-1">

    <!-- Header -->
    <header class="flex items-center justify-between mb-8 pb-6 border-b border-slate-800">
      <div>
        <div class="flex items-center gap-3">
          <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
          <h1 class="text-2xl font-black tracking-tight">Motion Studio AI</h1>
          <span class="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold">Research-to-Video</span>
        </div>
          <p class="text-slate-400 text-xs mt-1">Local Codex web research • AI screen plan • Dynamic voice • Remotion render</p>
      </div>
      <div class="flex items-center gap-2">
        <div id="statusDot" class="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
          <span id="statusIndicator" class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span id="statusText">Ready</span>
        </div>
        <a href="http://localhost:3000" target="_blank" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition">
          Remotion Studio ↗
        </a>
      </div>
    </header>

    <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">

      <!-- Left: Job Creation Panel -->
      <div class="xl:col-span-5 space-y-4">

        <!-- New Job Form -->
        <div class="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 glow">
          <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Create Research Video Job</h2>

          <!-- Theme -->
          <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Visual Theme</label>
          <div class="grid grid-cols-4 gap-2 mb-4">
            <button onclick="setTheme('claude')" id="theme-claude" class="theme-btn border border-slate-800 bg-slate-950 text-slate-300 font-semibold py-2 px-2 rounded-xl text-xs text-left transition hover:border-slate-700">
              <span class="block text-orange-400 font-bold text-xs">🏛️ Claude</span>
            </button>
            <button onclick="setTheme('cyber')" id="theme-cyber" class="theme-btn theme-active border border-indigo-500 bg-indigo-500/20 text-white font-semibold py-2 px-2 rounded-xl text-xs text-left transition">
              <span class="block text-emerald-400 font-bold text-xs">🛡️ Cyber</span>
            </button>
            <button onclick="setTheme('indigo')" id="theme-indigo" class="theme-btn border border-slate-800 bg-slate-950 text-slate-300 font-semibold py-2 px-2 rounded-xl text-xs text-left transition hover:border-slate-700">
              <span class="block text-indigo-400 font-bold text-xs">⚡ Indigo</span>
            </button>
            <button onclick="setTheme('fintech')" id="theme-fintech" class="theme-btn border border-slate-800 bg-slate-950 text-slate-300 font-semibold py-2 px-2 rounded-xl text-xs text-left transition hover:border-slate-700">
              <span class="block text-amber-400 font-bold text-xs">🪙 Fintech</span>
            </button>
          </div>

          <!-- Topic / Instructions -->
          <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Topic / Instructions</label>
          <textarea id="instructionsInput" rows="4" class="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-600 transition"
            placeholder="Use four lines for the best result:\nTopic: PHP vulnerability CVE details\nAngle: Explain impact and safe mitigation\nAudience: developers and security engineers\nFormat: 60s 9:16, calm and clear\n\nGemini will research sources, extract claims, write the voice-over, plan scenes, and render the MP4."></textarea>

          <!-- Settings Row -->
          <div class="grid grid-cols-3 gap-2 mt-3">
            <div>
              <label class="block text-xs text-slate-500 mb-1">Aspect Ratio</label>
              <select id="aspectRatio" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                <option value="9:16">9:16 Vertical</option>
                <option value="16:9">16:9 Landscape</option>
                <option value="1:1">1:1 Square</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-slate-500 mb-1">Duration (sec)</label>
              <input id="durationInput" type="number" value="60" min="30" max="300" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
            </div>
            <div>
              <label class="block text-xs text-slate-500 mb-1">Frame Rate</label>
              <select id="fpsSelect" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white">
                <option value="60">60 FPS</option>
                <option value="30">30 FPS</option>
              </select>
            </div>
          </div>

          <!-- Gemini Key -->
          <div class="mt-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-bold text-slate-300 flex items-center gap-1">
                ✨ Optional API fallback key
                <span class="text-[10px] text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.5 rounded-full">Codex is used first</span>
              </label>
              <a href="https://aistudio.google.com" target="_blank" class="text-[10px] text-indigo-400 underline">Get free key →</a>
            </div>
            <input id="geminiKeyInput" type="password" placeholder="Optional Gemini key" class="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500">
          </div>

          <div class="mt-3 p-3 bg-emerald-950/20 rounded-xl border border-emerald-900/40">
            <div class="text-xs font-bold text-emerald-300">🎙️ Voice-over</div>
            <p class="text-[11px] text-slate-400 mt-1">Codex runs locally for research and planning. Voice uses ElevenLabs, OpenAI TTS, then local espeak-ng. Google TTS is not used.</p>
          </div>

          <!-- Quick Presets -->
          <div class="mt-3 flex flex-wrap gap-1.5">
            <span class="text-[11px] text-slate-500 py-1">Presets:</span>
            <button onclick="setPreset('php')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition">🐘 PHP Vuln</button>
            <button onclick="setPreset('ztna')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition">🛡️ Zero Trust</button>
            <button onclick="setPreset('ai')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition">🤖 AI Models</button>
            <button onclick="setPreset('fintech')" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition">🪙 Fintech</button>
          </div>

          <!-- Submit -->
          <button id="submitBtn" onclick="createJob()" class="mt-4 w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition active:scale-[0.99]">
            <span id="submitText">🚀 Codex Research & Generate Video</span>
            <svg id="submitSpinner" class="animate-spin h-4 w-4 text-white hidden" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
          </button>
        </div>

        <!-- Legacy Quick Render (preserved) -->
        <details class="bg-slate-900/40 rounded-2xl border border-slate-800">
          <summary class="p-4 cursor-pointer text-xs font-semibold text-slate-400 hover:text-white transition">⚡ Legacy Quick Render (no research, instant sync)</summary>
          <div class="p-4 pt-0 space-y-3">
            <textarea id="legacyPrompt" rows="3" class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs placeholder-slate-600" placeholder="Enter your product idea..."></textarea>
            <input id="legacyGeminiKey" type="password" placeholder="Gemini API key (optional)" class="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-600">
            <button onclick="legacyRender()" class="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 rounded-xl text-xs transition">Render Now (Sync)</button>
          </div>
        </details>

        <!-- Provider Status -->
        <div id="providerStatus" class="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 text-xs text-slate-500">
          <span class="text-slate-400 font-semibold block mb-2">Provider Setup Status</span>
          <div id="providerStatusContent">Loading...</div>
        </div>

      </div>

      <!-- Center: Job List -->
      <div class="xl:col-span-3">
        <div class="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 h-full">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Job Queue</h2>
            <button onclick="loadJobs()" class="text-[11px] text-slate-500 hover:text-white transition">↻ Refresh</button>
          </div>
          <div id="jobList" class="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            <p class="text-slate-600 text-xs text-center py-8">No jobs yet. Create one above.</p>
          </div>
        </div>
      </div>

      <!-- Right: Job Detail Panel -->
      <div class="xl:col-span-4">
        <div id="jobDetail" class="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 h-full">
          <p class="text-slate-600 text-sm text-center py-16">Select a job to see details.</p>
        </div>
      </div>

    </div>
  </div>

  <footer class="text-center text-xs text-slate-700 mt-8">
    Motion Studio AI • Research → Script → Voice-over → 60 FPS Remotion Render • Powered by Gemini + FFmpeg
  </footer>

  <script>
    let selectedTheme = 'cyber';
    let selectedJobId = null;
    let pollInterval = null;

    // ── Theme ──
    function setTheme(theme) {
      selectedTheme = theme;
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('theme-active'));
      document.getElementById('theme-' + theme).classList.add('theme-active');
    }

    // ── Presets ──
    function setPreset(type) {
      const presets = {
        php: { text: "A newly disclosed PHP vulnerability. Research current CVE advisories, affected versions (PHP 8.x), patch status, and mitigations. Audience: developers and security engineers. Style: cinematic technical motion graphics with animated code and security diagrams. Output: 90-second 60 FPS MP4.", theme: 'cyber' },
        ztna: { text: "Zero Trust Network Access architecture for enterprise cloud security. Research ZTNA vs legacy VPN, major vendors, adoption statistics, and implementation best practices. Audience: IT decision makers. Style: architecture diagrams and kinetic typography.", theme: 'cyber' },
        ai: { text: "Latest AI language model developments in 2025. Compare GPT-4, Claude, and Gemini on reasoning benchmarks, multimodal capabilities, and pricing. Audience: tech enthusiasts and developers.", theme: 'indigo' },
        fintech: { text: "High-frequency algorithmic trading technology. Research sub-millisecond order execution, risk management systems, and regulatory compliance (MiFID II). Audience: fintech developers.", theme: 'fintech' },
      };
      const p = presets[type];
      if (p) {
        document.getElementById('instructionsInput').value = p.text;
        setTheme(p.theme);
      }
    }

    // ── Create Job ──
    async function createJob() {
      const instructions = document.getElementById('instructionsInput').value.trim();
      if (!instructions) { alert('Please enter instructions or a topic.'); return; }

      const btn = document.getElementById('submitBtn');
      const btnText = document.getElementById('submitText');
      const spinner = document.getElementById('submitSpinner');
      btn.disabled = true;
      btnText.textContent = 'Creating job...';
      spinner.classList.remove('hidden');

      try {
        const res = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instructions,
            settings: {
              theme: selectedTheme,
              aspectRatio: document.getElementById('aspectRatio').value,
              targetDurationSeconds: parseInt(document.getElementById('durationInput').value) || 60,
              fps: parseInt(document.getElementById('fpsSelect').value) || 60,
              pipelineMode: 'codex-local',
              audience: 'Technical viewers',
              style: 'calm and clear cinematic technical motion graphics',
              geminiApiKey: document.getElementById('geminiKeyInput').value.trim() || undefined,
            },
          }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        await loadJobs();
        selectJob(data.job.id);
        startPolling();
      } catch (err) {
        alert('Failed to create job: ' + err.message);
      } finally {
        btn.disabled = false;
        btnText.textContent = '🚀 Codex Research & Generate Video';
        spinner.classList.add('hidden');
      }
    }

    // ── Job list ──
    async function loadJobs() {
      try {
        const res = await fetch('/api/jobs');
        const data = await res.json();
        renderJobList(data.jobs || []);
      } catch { }
    }

    function renderJobList(jobs) {
      const container = document.getElementById('jobList');
      if (!jobs.length) {
        container.innerHTML = '<p class="text-slate-600 text-xs text-center py-8">No jobs yet.</p>';
        return;
      }
      container.innerHTML = jobs.map(j => {
        const stageColors = {
          queued: 'text-slate-500', researching: 'text-blue-400', scripting: 'text-purple-400',
          voiceover: 'text-cyan-400', planning_scenes: 'text-indigo-400', rendering: 'text-yellow-400',
          validating: 'text-orange-400', completed: 'text-emerald-400', failed: 'text-red-400', cancelled: 'text-slate-600',
        };
        const stageEmoji = {
          queued: '⏳', researching: '🔍', scripting: '✍️', voiceover: '🎙️',
          planning_scenes: '🎬', rendering: '⚙️', validating: '✅', completed: '🎉', failed: '❌', cancelled: '🚫',
        };
        const color = stageColors[j.stage] || 'text-slate-400';
        const emoji = stageEmoji[j.stage] || '•';
        const isSelected = j.id === selectedJobId;
        return \`<div class="job-card p-3 bg-slate-950 rounded-xl border border-slate-800 \${isSelected ? 'selected' : ''}" onclick="selectJob('\${j.id}')">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[11px] text-slate-500 font-mono">\${j.id.slice(-8)}</span>
            <span class="\${color} text-[11px] font-semibold">\${emoji} \${j.stage}</span>
          </div>
          <p class="text-xs text-slate-300 truncate">\${j.instructions.slice(0,60)}</p>
          \${j.stage !== 'completed' && j.stage !== 'failed' && j.stage !== 'cancelled' ? \`
            <div class="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full bg-indigo-500 progress-bar rounded-full" style="width:\${j.progress}%"></div>
            </div>\` : ''}
        </div>\`;
      }).join('');
    }

    // ── Job detail ──
    async function selectJob(id) {
      selectedJobId = id;
      document.querySelectorAll('.job-card').forEach(c => c.classList.remove('selected'));
      const card = [...document.querySelectorAll('.job-card')].find(c => c.onclick?.toString().includes(id));
      if (card) card.classList.add('selected');
      await refreshJobDetail();
    }

    async function refreshJobDetail() {
      if (!selectedJobId) return;
      try {
        const res = await fetch(\`/api/jobs/\${selectedJobId}\`);
        const data = await res.json();
        if (data.job) renderJobDetail(data.job);
      } catch { }
    }

    function renderJobDetail(job) {
      const stageEmoji = {
        queued: '⏳', researching: '🔍', scripting: '✍️', voiceover: '🎙️',
        planning_scenes: '🎬', rendering: '⚙️', validating: '✅', completed: '🎉', failed: '❌', cancelled: '🚫',
      };
      const stages = ['queued','researching','scripting','voiceover','planning_scenes','rendering','validating','completed'];
      const currentIdx = stages.indexOf(job.stage);

      let html = \`<div class="space-y-4">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-sm font-bold text-white">\${job.videoTitle || 'Processing...'}</h3>
            <p class="text-xs text-slate-500 mt-0.5 font-mono">\${job.id}</p>
          </div>
          \${['queued','researching','scripting','voiceover','planning_scenes','rendering'].includes(job.stage) ?
            \`<button onclick="cancelJob('\${job.id}')" class="text-[11px] text-red-400 hover:text-red-300 border border-red-900/40 px-2 py-1 rounded transition">Cancel</button>\` : ''}
        </div>\`;

      // Progress bar
      if (job.stage !== 'completed' && job.stage !== 'failed' && job.stage !== 'cancelled') {
        html += \`<div>
          <div class="flex justify-between text-[11px] text-slate-500 mb-1">
            <span>\${stageEmoji[job.stage] || ''} \${job.stage.replace(/_/g,' ')}</span>
            <span>\${job.progress}%</span>
          </div>
          <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 progress-bar rounded-full" style="width:\${job.progress}%"></div>
          </div>
        </div>\`;
      }

      // Stage pipeline
      html += \`<div class="flex gap-1 flex-wrap">\${stages.map((s,i) => {
        const cls = i < currentIdx ? 'bg-emerald-900/50 text-emerald-400 border-emerald-800/50' :
                    i === currentIdx ? 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50 pulse-ring' :
                    'bg-slate-900 text-slate-600 border-slate-800';
        return \`<span class="text-[10px] border px-2 py-0.5 rounded-full \${cls}">\${s.replace(/_/g,' ')}</span>\`;
      }).join('')}</div>\`;

      // Error
      if (job.stage === 'failed') {
        html += \`<div class="bg-red-950/50 border border-red-900/40 rounded-xl p-3">
          <p class="text-red-400 text-xs font-semibold mb-1">Failed at: \${job.failedStage || 'unknown'}</p>
          <p class="text-red-300 text-xs">\${job.errorMessage || 'Unknown error'}</p>
        </div>\`;
      }

      // Sources
      if (job.sources && job.sources.length > 0) {
        html += \`<div>
          <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Research Sources (\${job.sources.length})</h4>
          <div class="space-y-1.5 max-h-32 overflow-y-auto pr-1">\${job.sources.map(s =>
            \`<div class="source-card">
              <a href="\${s.url}" target="_blank" class="text-indigo-400 text-xs hover:underline truncate block">\${s.title}</a>
              <span class="text-[10px] text-slate-500">\${s.publisher || ''}\${s.publicationDate ? ' — ' + s.publicationDate : ''}</span>
            </div>\`
          ).join('')}</div>
        </div>\`;
      }

      // Script preview
      if (job.script) {
        html += \`<div>
          <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Narration Script</h4>
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 max-h-28 overflow-y-auto leading-relaxed">\${job.script}</div>
        </div>\`;
      }

      if (job.voiceProvider) {
        html += \`<div class="text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 rounded-lg px-3 py-2">
          🎙️ Audible voiceover: <strong>\${job.voiceProvider}</strong> · \${job.voiceoverDurationSeconds ? job.voiceoverDurationSeconds.toFixed(1) + 's' : 'ready'}
        </div>\`;
      }

      // Video output
      if (job.stage === 'completed' && job.outputVideoUrl) {
        html += \`<div>
          <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Output Video</h4>
          <div class="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <video src="\${job.outputVideoUrl}" controls autoplay loop class="w-full max-h-64 object-contain"></video>
          </div>
          <div class="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-500 text-center">
            <div class="bg-slate-900 rounded-lg p-1.5">\${job.outputFps ? job.outputFps.toFixed(0) + ' FPS' : '--'}</div>
            <div class="bg-slate-900 rounded-lg p-1.5">\${job.outputDurationSeconds ? job.outputDurationSeconds.toFixed(1) + 's' : '--'}</div>
            <div class="bg-slate-900 rounded-lg p-1.5">\${job.outputFileSizeBytes ? (job.outputFileSizeBytes/1024/1024).toFixed(1) + ' MB' : '--'}</div>
          </div>
          \${job.validationDetails ? \`<p class="mt-1 text-[10px] text-emerald-400">\${job.validationDetails}</p>\` : ''}
          <a href="\${job.outputVideoUrl}" download class="mt-2 block w-full text-center bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition">
            Download MP4 ↓
          </a>
        </div>\`;
      }

      html += '</div>';
      document.getElementById('jobDetail').innerHTML = html;
    }

    async function cancelJob(id) {
      if (!confirm('Cancel this job?')) return;
      await fetch(\`/api/jobs/\${id}/cancel\`, { method: 'POST' });
      await loadJobs();
      await refreshJobDetail();
    }

    // ── Polling ──
    function startPolling() {
      if (pollInterval) return;
      pollInterval = setInterval(async () => {
        await loadJobs();
        await refreshJobDetail();
        // Stop polling if no active jobs
        const res = await fetch('/api/jobs');
        const data = await res.json();
        const hasActive = (data.jobs || []).some(j => !['completed','failed','cancelled'].includes(j.stage));
        if (!hasActive) { clearInterval(pollInterval); pollInterval = null; }
      }, 2500);
    }

    // ── Legacy render ──
    async function legacyRender() {
      const prompt = document.getElementById('legacyPrompt').value.trim();
      if (!prompt) { alert('Enter a prompt'); return; }
      const geminiApiKey = document.getElementById('legacyGeminiKey').value.trim() || undefined;
      try {
        const res = await fetch('/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, geminiApiKey }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        alert('Video ready: ' + data.videoUrl);
      } catch(err) {
        alert('Render failed: ' + err.message);
      }
    }

    // ── Provider status ──
    async function loadProviderStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const cap = data.capabilities;
        const check = (v) => v ? '<span class="text-emerald-400">✓</span>' : '<span class="text-slate-600">✗</span>';
        document.getElementById('providerStatusContent').innerHTML = \`
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <span>\${check(cap.codex)} Local Codex research/script</span>
            <span>\${check(cap.gemini || cap.openai)} API AI fallback</span>
            <span>\${check(cap.research.tavily)} Tavily Search</span>
            <span>\${check(cap.research.serpapi)} SerpAPI Search</span>
            <span>\${check(cap.research.brave)} Brave Search</span>
            <span>\${check(true)} DuckDuckGo (free)</span>
            <span>\${check(cap.tts.elevenlabs)} ElevenLabs voice (preferred)</span>
            <span>\${check(cap.tts.openai)} OpenAI voice (fallback)</span>
          </div>
          <p class="text-[10px] text-slate-600 mt-2">Required: Gemini key. Cloud voice keys improve quality; local espeak-ng keeps narration audible without them.</p>
        \`;
      } catch { }
    }

    // ── Init ──
    loadJobs();
    loadProviderStatus();
  </script>
</body>
</html>`;
}

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🎬 Motion Studio AI — Research-to-Video Pipeline`);
  console.log(`👉 Open: http://localhost:${PORT}`);
  console.log(`📡 Job API: POST /api/jobs`);
  console.log(`📊 Status:  GET  /api/status`);
  console.log(`======================================================\n`);
});
