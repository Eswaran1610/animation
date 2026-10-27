// Usage:
//   npx tsx make.ts "idea for the video"
//   npx tsx make.ts campaigns/claude_code_example.json
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { Campaign, TCampaign } from "./src/claude-motion/schema";

const RULES = `You turn an idea into a JSON campaign for a vertical 1080x1920 Claude-style motion video.
Return ONLY JSON (no markdown) matching:
{"name": slug, "fps": 30, "scenes": [...3-6 scenes]}
Scene types:
 title:    {type,seconds(1.5-8),eyebrow?,headline<=80 chars,sub?<=140}
 terminal: {type,seconds(2-12),lines:[{kind:"cmd"|"out",text<=70}] (max 8)}
 diagram:  {type,seconds(3-10),caption?,nodes:[{id,label<=18,x(8-92),y(12-88)}] (2-6),edges:[[fromId,toId]]}
Style: calm, one idea per scene, start with a title, end with a title. Short punchy copy.`;

async function askAnthropic(idea: string): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: RULES,
      messages: [{ role: "user", content: idea }],
    }),
  });
  const d: any = await r.json();
  return (d.content?.[0]?.text ?? "").replace(/```json|```/g, "").trim();
}

function generateLocalCampaign(idea: string): TCampaign {
  const slug = idea.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30).replace(/^-|-$/g, "") || "claude-demo";
  return {
    name: slug,
    fps: 30,
    scenes: [
      {
        type: "title",
        seconds: 3.5,
        eyebrow: "Claude Code",
        headline: idea.slice(0, 75),
        sub: "Autonomous multi-file refactoring and deterministic verification.",
      },
      {
        type: "terminal",
        seconds: 6,
        lines: [
          { kind: "cmd", text: "claude review --strict --fix-bugs" },
          { kind: "out", text: "AST parsed 58 files in 1.2s..." },
          { kind: "out", text: "3 regressions detected, 3 auto-repaired" },
          { kind: "out", text: "✔ All unit tests passing" },
        ],
      },
      {
        type: "diagram",
        seconds: 5.5,
        caption: "From local terminal to cloud production",
        nodes: [
          { id: "a", label: "Developer", x: 50, y: 22 },
          { id: "b", label: "Claude Code", x: 50, y: 50 },
          { id: "c", label: "Production", x: 50, y: 78 },
        ],
        edges: [
          ["a", "b"],
          ["b", "c"],
        ],
      },
      {
        type: "title",
        seconds: 3,
        headline: "Ship with confidence.",
        sub: "Built for developer velocity.",
      },
    ],
  };
}

(async () => {
  const arg = process.argv.slice(2).join(" ").trim();
  if (!arg) {
    console.error("Usage: npx tsx make.ts \"<idea or path to json>\"");
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
      console.log("Generating campaign via Claude API...");
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
    // Fallback: smart deterministic local generation
    if (!campaign) {
      console.log("Generating Claude-style campaign locally...");
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
  console.log(`📐 Aspect: 9:16 (1080x1920) | Scenes: ${campaign.scenes.length}`);
  console.log(`=============================================================\n`);

  const videoOut = `out/${campaign.name}.mp4`;
  const contactOut = `out/${campaign.name}_contact.png`;

  execSync(`npx remotion render src/index.tsx ClaudeMotion ${videoOut} --props=${file} --overwrite`, { stdio: "inherit" });

  // Generate QC Contact Sheet
  console.log(`\nGenerating QC Contact Sheet: ${contactOut}`);
  execSync(`ffmpeg -y -i ${videoOut} -vf "fps=1/2,scale=450:-1,tile=4x2" -frames:v 1 ${contactOut}`, { stdio: "inherit" });

  console.log(`\n✔ Video Render Complete: ${videoOut}`);
  console.log(`✔ QC Contact Sheet: ${contactOut}`);
  console.log(`✔ Preserved Campaign Data: ${file}\n`);
})();
