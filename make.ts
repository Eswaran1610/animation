// Usage:
//   npx tsx make.ts "idea for the video"
//   npx tsx make.ts campaigns/claude_code_example.json
//   npx tsx make.ts "idea for the video" --preview
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { Campaign, TCampaign } from "./src/claude-motion/schema";

const RULES = `You turn an idea into a JSON campaign for a vertical 1080x1920 Claude-style motion video.
Return ONLY valid JSON (no markdown fences, no explanatory text) matching:
{
  "name": "short-slug",
  "fps": 30,
  "size": "9:16",
  "audio": { "music": "claude_audio.wav", "musicVolume": 0.35, "sfx": true },
  "scenes": [...3-6 scenes]
}

Supported Scene Types:
- title:        { type: "title", seconds: 2-5, eyebrow?: string, headline: string (<=80 chars), sub?: string, sfx?: "whoosh"|"impact"|"click" }
- terminal:     { type: "terminal", seconds: 3-8, eyebrow?: string, lines: [{ kind: "cmd"|"out", text: string (<=70) }], sfx?: string }
- diagram:      { type: "diagram", seconds: 3-8, eyebrow?: string, caption?: string, nodes: [{ id: string, label: string (<=20), x: 10-90, y: 15-85 }], edges: [[fromId, toId]] }
- stat:         { type: "stat", seconds: 2-5, eyebrow?: string, value: string (<=20, e.g. "99.9%", "10x"), label: string, sub?: string, sfx?: "impact" }
- before_after: { type: "before_after", seconds: 3-8, eyebrow?: string, headline?: string, beforeTitle: string, beforeItems: string[], afterTitle: string, afterItems: string[] }
- list:         { type: "list", seconds: 3-8, eyebrow?: string, headline: string, items: string[] (2-5 items) }
- quote:        { type: "quote", seconds: 2-6, quote: string, author: string, role?: string }
- cta:          { type: "cta", seconds: 2-5, eyebrow?: string, headline: string, sub?: string, buttonText?: string, sfx?: "impact" }

Style Guidelines:
- Calm, thoughtful rhythm, one core concept per scene.
- Warm clay accent (#D97757), dark background (#1A1916), Georgia serif headlines, mono terminal commands.
- Start with a title or stat, progress with terminal/diagram/comparison, end with a cta or title.`;

async function askAnthropic(idea: string): Promise<string> {
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2500,
      system: RULES,
      messages: [{ role: "user", content: idea }],
    }),
  });

  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`Claude API error HTTP ${r.status}: ${errText}`);
  }

  const d: any = await r.json();
  const text = (d.content?.[0]?.text ?? "").replace(/```json|```/g, "").trim();
  return text;
}

function generateLocalCampaign(idea: string): TCampaign {
  const cleanIdea = idea.trim().replace(/\s+/g, " ");
  const slug = cleanIdea.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30).replace(/^-|-$/g, "") || "motion-demo";
  
  // Extract key phrases for custom scenes
  const words = cleanIdea.split(" ");
  const titleHeadline = cleanIdea.length > 70 ? words.slice(0, 8).join(" ") : cleanIdea;
  const subHeadline = cleanIdea.length > 70 ? words.slice(8).join(" ") : "Data-driven motion graphics powered by Remotion.";

  return {
    name: slug,
    fps: 30,
    size: "9:16",
    audio: {
      music: "claude_audio.wav",
      musicVolume: 0.35,
      sfx: true,
    },
    scenes: [
      {
        type: "title",
        seconds: 3.5,
        eyebrow: "ARCHITECTURE & MOTION",
        headline: titleHeadline.slice(0, 80),
        sub: subHeadline.slice(0, 140),
        sfx: "whoosh",
      },
      {
        type: "terminal",
        seconds: 5.5,
        eyebrow: "EXECUTION PIPELINE",
        lines: [
          { kind: "cmd", text: `execute --target="${slug}" --verify` },
          { kind: "out", text: `Analyzing: ${cleanIdea.slice(0, 50)}...` },
          { kind: "out", text: "✔ Synthesis complete with zero human latency" },
          { kind: "out", text: "✔ Generated verified scenes & motion plan" },
        ],
        sfx: "click",
      },
      {
        type: "stat",
        seconds: 4.0,
        eyebrow: "PERFORMANCE",
        value: "100%",
        label: "Deterministic Remotion Rendering",
        sub: "Zero manual video editing required.",
        sfx: "impact",
      },
      {
        type: "cta",
        seconds: 3.5,
        eyebrow: "GET STARTED",
        headline: "Turn Any Idea Into Motion.",
        sub: cleanIdea.slice(0, 100),
        buttonText: "Explore Pipeline →",
        sfx: "whoosh",
      },
    ],
  };
}

(async () => {
  const rawArgs = process.argv.slice(2);
  const isPreview = rawArgs.includes("--preview") || rawArgs.includes("--quick");
  const filteredArgs = rawArgs.filter((a) => a !== "--preview" && a !== "--quick" && !a.startsWith("--scale="));
  const scaleArg = rawArgs.find((a) => a.startsWith("--scale=")) || (isPreview ? "--scale=0.5" : "");

  const arg = filteredArgs.join(" ").trim();
  if (!arg) {
    console.error('Usage: npx tsx make.ts "<idea or path to json>" [--preview]');
    process.exit(1);
  }

  let campaign: TCampaign | null = null;

  // Case 1: Argument is a JSON file
  if (existsSync(arg) && arg.endsWith(".json")) {
    const raw = JSON.parse(readFileSync(arg, "utf-8"));
    campaign = Campaign.parse(raw.campaign || raw);
  } else if (arg.startsWith("{")) {
    const raw = JSON.parse(arg);
    campaign = Campaign.parse(raw.campaign || raw);
  } else {
    // Case 2: Argument is an idea prompt
    if (process.env.ANTHROPIC_API_KEY) {
      console.log(`Generating campaign via Claude API (${process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"})...`);
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const raw = await askAnthropic(arg);
          campaign = Campaign.parse(JSON.parse(raw));
          break;
        } catch (e: any) {
          console.warn(`Attempt ${attempt + 1} failed:`, e.message);
        }
      }
    }
    // Fallback: smart deterministic local generation from the actual user idea
    if (!campaign) {
      console.log("Generating Claude-style campaign locally from your prompt...");
      campaign = Campaign.parse(generateLocalCampaign(arg));
    }
  }

  if (!campaign) throw new Error("Could not produce a valid campaign");

  mkdirSync("campaigns", { recursive: true });
  mkdirSync("out", { recursive: true });

  const file = `campaigns/${campaign.name}.json`;
  writeFileSync(file, JSON.stringify({ campaign }, null, 2));

  console.log(`\n=============================================================`);
  console.log(`🎬 Rendering Claude Motion: ${campaign.name}`);
  console.log(`📐 Aspect: ${campaign.size} | Scenes: ${campaign.scenes.length}`);
  if (scaleArg) console.log(`⚡ Preview Scale: ${scaleArg}`);
  console.log(`=============================================================\n`);

  const videoOut = `out/${campaign.name}.mp4`;
  const contactOut = `out/${campaign.name}_contact.png`;

  const scaleFlag = scaleArg ? ` ${scaleArg}` : "";
  execSync(
    `npx remotion render src/index.tsx ClaudeMotion ${videoOut} --props=${file} --overwrite${scaleFlag}`,
    { stdio: "inherit" }
  );

  // Generate QC Contact Sheet if ffmpeg is available
  try {
    console.log(`\nGenerating QC Contact Sheet: ${contactOut}`);
    execSync(
      `ffmpeg -y -i ${videoOut} -vf "fps=1/2,scale=450:-1,tile=4x2" -frames:v 1 ${contactOut}`,
      { stdio: "inherit" }
    );
    console.log(`✔ QC Contact Sheet: ${contactOut}`);
  } catch {
    console.warn("Notice: FFmpeg contact sheet generation skipped or failed.");
  }

  console.log(`\n✔ Video Render Complete: ${videoOut}`);
  console.log(`✔ Preserved Campaign Data: ${file}\n`);
})();
