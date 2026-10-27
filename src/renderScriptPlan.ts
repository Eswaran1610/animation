import fs from "fs";
import path from "path";
import { MasterScriptPlanSchema, MasterScriptPlan } from "./scriptSchema";
import {
  OUTPUT_DIR,
  createContactSheet,
  ensureVideoDirectories,
  renderComposition,
} from "./render/videoPipeline";

ensureVideoDirectories();

// Convert rough user text into a structured MasterScriptPlan if needed
export function buildPlanFromText(input: string | MasterScriptPlan): MasterScriptPlan {
  if (typeof input === "object" && input.scenes) {
    return MasterScriptPlanSchema.parse(input);
  }

  const raw = String(input);
  let parsed: any;

  try {
    parsed = JSON.parse(raw);
    return MasterScriptPlanSchema.parse(parsed);
  } catch {
    // If user provided natural text/lines instead of JSON, parse line-by-line automatically!
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);

    return MasterScriptPlanSchema.parse({
      title: lines[0] || "Automated Motion Campaign",
      brand: {
        name: "Motion Engine",
        primaryColor: raw.toLowerCase().includes("cyber") || raw.toLowerCase().includes("security") ? "#10B981" : "#6366F1",
        accentColor: "#06B6D4",
        backgroundColor: "#030712",
      },
      aspectRatio: "9:16",
      ctaText: "Get Started Free →",
      scenes: [
        {
          id: "scene_1",
          type: "hook",
          tag: "THE CHALLENGE",
          headline: lines[0] || "Transform Your Ideas Into Code Motion",
          accentWord: lines[0]?.split(" ")[1] || "Ideas",
          description: lines[1] || "Stop building animations manually frame-by-frame.",
          durationSeconds: 5,
        },
        {
          id: "scene_2",
          type: "solution",
          tag: "AUTOMATED SOLUTION",
          headline: lines[2] || "Pure React Motion. Rendered Instantly.",
          accentWord: "Instant",
          items: [
            lines[3] || "Deterministic Closed-Form Springs",
            lines[4] || "Universal Responsive Formats",
            "Continuous Parallax Camera",
          ],
          durationSeconds: 6,
        },
        {
          id: "scene_3",
          type: "stats",
          tag: "VERIFIED RESULTS",
          headline: "Production Speed Multiplied",
          statNumber: "10x",
          statLabel: "Faster Than Manual Video Editing",
          durationSeconds: 5,
        },
        {
          id: "scene_4",
          type: "cta",
          tag: "READY TO SHIP",
          headline: "Deploy Your Video Campaign Now",
          accentWord: "Now",
          durationSeconds: 5,
        },
      ],
    });
  }
}

export async function renderScriptPlan(planInput: string | MasterScriptPlan, outputName?: string) {
  const plan = buildPlanFromText(planInput);
  const outSlug = outputName || `script_video_${Date.now()}`;
  const totalDurationFrames = plan.scenes.reduce((acc, s) => acc + s.durationSeconds * 30, 0);

  const propsPath = path.join(OUTPUT_DIR, `props_${outSlug}.json`);
  fs.writeFileSync(propsPath, JSON.stringify({ plan }, null, 2));

  const videoOut = path.join(OUTPUT_DIR, `${outSlug}.mp4`);
  const contactOut = path.join(OUTPUT_DIR, `${outSlug}_contact.png`);

  console.log(`\n======================================================`);
  console.log(`🎬 Rendering Automated Script Video: ${outSlug}.mp4`);
  console.log(`Total Duration: ${totalDurationFrames / 30}s (${totalDurationFrames} frames @ 30 FPS)`);
  console.log(`======================================================\n`);

  // Render video
  renderComposition({
    compositionId: "Dynamic-Script-Video",
    outputPath: videoOut,
    propsPath,
    frames: `0-${totalDurationFrames - 1}`,
  });

  // Generate automated QC contact sheet
  createContactSheet({
    videoPath: videoOut,
    outputPath: contactOut,
    sampleEverySeconds: Math.max(1, Math.floor(totalDurationFrames / 300)),
    scaleWidth: 220,
  });

  console.log(`✔ Finished MP4: ${videoOut}`);
  console.log(`✔ Contact Sheet: ${contactOut}\n`);

  return { videoOut, contactOut };
}

// Standalone execution support
if (require.main === module) {
  const arg = process.argv[2] || "Build Motion From Scratch\nNever edit keyframes again\nOne Plan Generates All Formats";
  renderScriptPlan(arg).catch(console.error);
}
