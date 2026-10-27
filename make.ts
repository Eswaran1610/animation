#!/usr/bin/env node
/**
 * Motion Studio AI CLI
 * Pipeline: Prompt -> Research -> Dynamic Script -> Remotion 60 FPS Video
 *
 * Usage:
 *   npx tsx make.ts "<your topic or prompt>"
 *   npx tsx make.ts "VPN vs ZTNA Security" --theme=cyber --duration=30 --fps=60
 *   npx tsx make.ts campaigns/example.json
 */

import fs from "fs";
import path from "path";
import { researchTopic } from "./src/research/researchAdapter";
import { generateScriptPlan } from "./src/script/scriptGenerator";
import { generateVoiceover, alignScenesToAudio } from "./src/tts/ttsAdapter";
import { CampaignDataSchema, CampaignData } from "./src/engine/schema";
import { Campaign } from "./src/claude-motion/schema";
import {
  CAMPAIGNS_DIR,
  OUTPUT_DIR,
  createContactSheet,
  ensureVideoDirectories,
  probeVideo,
  renderComposition,
} from "./src/render/videoPipeline";

// Load .env
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/(^['"]|['"]$)/g, "").trim();
    }
  }
}

ensureVideoDirectories();

// Parse CLI arguments
function parseArgs(args: string[]) {
  const flags: Record<string, string> = {};
  const promptParts: string[] = [];

  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [k, v] = arg.slice(2).split("=");
      flags[k] = v || "true";
    } else {
      promptParts.push(arg);
    }
  }

  return {
    prompt: promptParts.join(" ").trim(),
    theme: flags.theme || (promptParts.join(" ").toLowerCase().includes("claude") ? "claude" : "cyber"),
    duration: parseInt(flags.duration || flags.seconds || "20"),
    fps: parseInt(flags.fps || "60"),
    ratio: (flags.ratio || "9:16") as "9:16" | "16:9" | "1:1",
    engine: flags.engine || "universal", // "universal" | "claude"
  };
}

async function main() {
  const rawArgs = process.argv.slice(2);
  if (!rawArgs.length) {
    console.log(`
🎬 Motion Studio AI CLI — Prompt-to-Video Engine

Usage:
  npx tsx make.ts "<prompt or topic>" [options]
  npx tsx make.ts <path-to-json-file>

Options:
  --theme=<cyber|claude|indigo|fintech>   Visual theme (default: cyber)
  --duration=<seconds>                    Target duration in seconds (default: 20)
  --fps=<30|60>                           Video frame rate (default: 60)
  --ratio=<9:16|16:9|1:1>                 Aspect ratio (default: 9:16)
  --engine=<universal|claude>             Render engine (default: universal)

Examples:
  npx tsx make.ts "PHP CVE-2024-4577 argument injection vulnerability"
  npx tsx make.ts "VPN vs ZTNA Cloud Security" --theme=cyber --duration=30 --fps=60
  npx tsx make.ts "Claude Code autonomous multi-file refactor" --theme=claude
`);
    process.exit(1);
  }

  const { prompt, theme, duration, fps, ratio, engine } = parseArgs(rawArgs);

  // ── Case 1: Direct JSON file render (Backward Compatibility) ────────────────
  if (fs.existsSync(prompt) && prompt.endsWith(".json")) {
    console.log(`\n📁 Detected existing campaign file: ${prompt}`);
    const raw = JSON.parse(fs.readFileSync(prompt, "utf-8"));
    if (raw.campaign && raw.campaign.scenes?.[0]?.type === "title") {
      // Claude-motion schema
      const campaign = Campaign.parse(raw.campaign || raw);
      const videoOut = path.join(OUTPUT_DIR, `${campaign.name}.mp4`);
      console.log(`🎬 Rendering Claude Motion: ${videoOut}`);
      renderComposition({
        compositionId: "ClaudeMotion",
        outputPath: videoOut,
        propsPath: prompt,
      });
      console.log(`✔ Finished: ${videoOut}`);
      return;
    } else {
      // Universal engine schema
      const { validateAndRender } = await import("./src/engine/runner");
      const res = validateAndRender(prompt);
      console.log(`✔ Finished: ${res.videoOut}`);
      return;
    }
  }

  // ── Case 2: Read from .txt or .md file if provided ──────────────────────────
  let userPrompt = prompt;
  if (fs.existsSync(prompt) && (prompt.endsWith(".txt") || prompt.endsWith(".md"))) {
    console.log(`\n📄 Reading 4-line storyboard file: ${prompt}`);
    userPrompt = fs.readFileSync(prompt, "utf-8").trim();
  }

  const promptLines = userPrompt.split(/\r?\n|\|/).map((l) => l.trim()).filter(Boolean);

  console.log(`\n======================================================`);
  console.log(`🚀 MOTION STUDIO AI PIPELINE`);
  console.log(`======================================================`);
  if (promptLines.length >= 2) {
    console.log(`📋 4-Line Storyboard Input:`);
    promptLines.slice(0, 4).forEach((l, i) => console.log(`   Line ${i + 1}: "${l}"`));
  } else {
    console.log(`💡 Prompt:    "${userPrompt}"`);
  }
  console.log(`🎨 Theme:     ${theme}`);
  console.log(`⏱️ Duration:  ${duration}s @ ${fps} FPS`);
  console.log(`📐 Ratio:     ${ratio}`);
  console.log(`======================================================\n`);

  const slug = (promptLines[0] || userPrompt)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .slice(0, 30)
    .replace(/^_+|_+$/g, "") || `video_${Date.now()}`;
  const campaignId = `${slug}_${Date.now().toString().slice(-4)}`;

  // ── Step 1: Research ────────────────────────────────────────────────────────
  console.log(`\n[1/5] 🔍 GATHERING RESEARCH & FACTUAL SOURCES...`);
  const research = await researchTopic(userPrompt);
  if (research.sources.length > 0) {
    console.log(`✔ Found ${research.sources.length} sources:`);
    research.sources.slice(0, 4).forEach((s, i) => {
      console.log(`   ${i + 1}. [${s.publisher || "Web"}] ${s.title.slice(0, 65)}...`);
    });
  } else {
    console.log(`✔ No external search keys configured. Using topic-grounded model research.`);
  }

  // ── Step 2: Dynamic Script & Scene Plan ──────────────────────────────────────
  console.log(`\n[2/5] ✍️  GENERATING DYNAMIC AI SCRIPT & SCENE PLAN...`);
  const scriptPlan = await generateScriptPlan(
    userPrompt,
    research.summary,
    research.sources,
    {
      targetDurationSeconds: duration,
      fps,
      aspectRatio: ratio,
      theme,
    }
  );

  console.log(`✔ Script Title: "${scriptPlan.videoTitle}"`);
  console.log(`✔ Choreographed ${scriptPlan.scenes.length} Scenes:`);
  scriptPlan.scenes.forEach((s, idx) => {
    console.log(`   Scene ${idx + 1} (${s.type}): "${s.headline || s.onScreenText}" [${s.durationSeconds}s]`);
  });

  // ── Step 3: Voiceover & Timing Alignment ─────────────────────────────────────
  console.log(`\n[3/5] 🎙️  VOICE-OVER & SCENE SYNCHRONIZATION...`);
  const ttsResult = await generateVoiceover(scriptPlan.narrationScript, campaignId);
  let finalScenes = scriptPlan.scenes;

  if (ttsResult.audioPath && ttsResult.durationSeconds > 0) {
    console.log(`✔ Voice-over audio generated (${ttsResult.durationSeconds.toFixed(1)}s). Aligning scenes...`);
    const aligned = alignScenesToAudio(
      scriptPlan.scenes.map((s) => ({ id: s.id, narration: s.narration, durationSeconds: s.durationSeconds })),
      ttsResult.durationSeconds,
      fps
    );
    finalScenes = scriptPlan.scenes.map((s, i) => ({ ...s, durationSeconds: aligned[i].durationSeconds }));
  } else {
    console.log(`✔ Using frame-accurate scene timing (${finalScenes.reduce((a, b) => a + b.durationSeconds, 0)}s).`);
  }

  // ── Step 4: Remotion 60 FPS Render ──────────────────────────────────────────
  console.log(`\n[4/5] 🎬 RENDERING REMOTION 60 FPS MOTION GRAPHICS...`);
  const totalFrames = finalScenes.reduce((acc, s) => acc + Math.round(s.durationSeconds * fps), 0);
  const totalSeconds = totalFrames / fps;

  const campaignData = {
    campaignId,
    title: scriptPlan.videoTitle,
    brand: {
      name: scriptPlan.brandName || "Motion Studio",
      primaryColor: scriptPlan.primaryColor,
      accentColor: scriptPlan.accentColor,
      backgroundColor: scriptPlan.backgroundColor,
      theme: (scriptPlan.theme as any) || theme,
    },
    aspectRatio: ratio,
    fps,
    ctaText: "Get Started →",
    audioTrack: ttsResult.audioPath
      ? path.relative(__dirname, ttsResult.audioPath)
      : "cyber_audio.wav",
    scenes: finalScenes.map((s) => ({
      id: s.id,
      type: s.type as any,
      tag: s.tag || "INSIGHT",
      headline: s.headline || s.onScreenText || s.narration.slice(0, 60),
      accentWord: s.accentWord,
      subtitle: s.subtitle,
      description: s.narration,
      terminalCommand: s.terminalCommand,
      terminalOutput: s.terminalOutput,
      terminalAlert: s.terminalAlert,
      beforeAfter: s.beforeAfter,
      items: s.items,
      metricTarget: s.metricTarget,
      metricSuffix: s.metricSuffix,
      metricLabel: s.metricLabel,
      secondaryMetricValue: s.secondaryMetricValue,
      secondaryMetricLabel: s.secondaryMetricLabel,
      ctaHeadline: s.ctaHeadline,
      trustBadges: s.trustBadges,
      nodeLeft: s.nodeLeft,
      nodeCenter: s.nodeCenter,
      nodeRight: s.nodeRight,
      durationSeconds: s.durationSeconds,
    })),
  };

  const validated = CampaignDataSchema.parse(campaignData);
  const campaignJsonPath = path.join(CAMPAIGNS_DIR, `${campaignId}.json`);
  fs.writeFileSync(campaignJsonPath, JSON.stringify(validated, null, 2));

  const propsPath = path.join(OUTPUT_DIR, `props_${campaignId}.json`);
  fs.writeFileSync(propsPath, JSON.stringify({ campaign: { ...validated, fps } }, null, 2));

  const videoOut = path.join(OUTPUT_DIR, `${campaignId}.mp4`);
  const contactOut = path.join(OUTPUT_DIR, `${campaignId}_contact.png`);

  renderComposition({
    compositionId: "Universal-Motion-Engine",
    outputPath: videoOut,
    propsPath,
    frames: `0-${totalFrames - 1}`,
  });

  // ── Step 5: Quality Control & ffprobe Validation ─────────────────────────────
  console.log(`\n[5/5] 🛡️  QUALITY CONTROL & FFPROBE VALIDATION...`);
  try {
    const probe = probeVideo(videoOut);
    const detectedDuration = probe.durationSeconds;
    const detectedFps = probe.fps || fps;

    console.log(`✔ Frame Rate:   ${detectedFps.toFixed(0)} FPS`);
    console.log(`✔ Duration:     ${detectedDuration.toFixed(1)}s`);
    console.log(`✔ Resolution:   ${probe.width}x${probe.height}`);
    console.log(`✔ File Size:    ${(probe.fileSizeBytes / 1024 / 1024).toFixed(1)} MB`);
  } catch (err: any) {
    console.warn(`ffprobe check notice: ${err.message?.slice(0, 60)}`);
  }

  // Generate Contact Sheet
  try {
    createContactSheet({
      videoPath: videoOut,
      outputPath: contactOut,
      sampleEverySeconds: Math.max(1, Math.floor(totalFrames / 260)),
      stdio: "pipe",
    });
    console.log(`✔ Contact Sheet: ${contactOut}`);
  } catch {}

  console.log(`\n======================================================`);
  console.log(`🎉 VIDEO GENERATION COMPLETE!`);
  console.log(`======================================================`);
  console.log(`📹 Video MP4:      ${videoOut}`);
  console.log(`📊 Campaign JSON:  ${campaignJsonPath}`);
  console.log(`🖼️ Contact Sheet:  ${contactOut}`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error("\n❌ CLI Pipeline Failed:", err.message);
  process.exit(1);
});
