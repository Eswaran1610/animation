import fs from "fs";
import path from "path";
import { execFileSync, execSync } from "child_process";
import { CampaignDataSchema, CampaignData, SupportedSceneTypes } from "./schema";
import { campaignToMotionPlan, PlanSchema, type MotionPlan } from "./plan";
import { prepareAudioBed } from "./audioBed";

const CAMPAIGNS_DIR = path.join(__dirname, "../../campaigns");
const OUTPUT_DIR = path.join(__dirname, "../../out");

if (!fs.existsSync(CAMPAIGNS_DIR)) fs.mkdirSync(CAMPAIGNS_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

/** Renders an already validated plan. Used by the asynchronous job queue. */
export function renderMotionPlan(planInput: MotionPlan, videoOut: string, propsPath: string) {
  const plan = PlanSchema.parse(planInput);
  const totalFrames = Math.round(Math.max(...plan.scenes.map((scene) => scene.start + scene.dur)) * plan.meta.fps);
  fs.mkdirSync(path.dirname(videoOut), { recursive: true });
  fs.writeFileSync(propsPath, JSON.stringify({ plan }, null, 2));
  const remotion = path.join(process.cwd(), "node_modules", ".bin", "remotion");
  execFileSync(remotion, [
    "render", "src/index.tsx", "Universal-Motion-Engine", videoOut,
    `--props=${propsPath}`, `--frames=0-${totalFrames - 1}`, "--overwrite",
  ], { stdio: "inherit" });
  return { videoOut, totalFrames };
}

export function validateAndRender(campaignInput: string | object) {
  let rawData: any;

  if (typeof campaignInput === "string") {
    // If it's a file path
    if (fs.existsSync(campaignInput)) {
      rawData = JSON.parse(fs.readFileSync(campaignInput, "utf-8"));
    } else {
      rawData = JSON.parse(campaignInput);
    }
  } else {
    rawData = campaignInput;
  }

  // 1. Strict Schema Validation (Rejects invalid formats or unsupported archetypes)
  const validationResult = CampaignDataSchema.safeParse(rawData);
  if (!validationResult.success) {
    console.error("\n❌ VALIDATION REJECTED: Campaign data does not meet schema standards!");
    console.error(JSON.stringify(validationResult.error.format(), null, 2));
    throw new Error("Validation failed. Check supported scene types: " + SupportedSceneTypes.join(", "));
  }

  const campaign: CampaignData = validationResult.data;

  // 2. Protect Old Outputs: Save campaign JSON to its own dedicated file
  const campaignJsonPath = path.join(CAMPAIGNS_DIR, `${campaign.campaignId}.json`);
  fs.writeFileSync(campaignJsonPath, JSON.stringify(campaign, null, 2));

  // 3. Unique dedicated output paths (Never overwrite other campaigns)
  const videoOut = path.join(OUTPUT_DIR, `${campaign.campaignId}.mp4`);
  const contactOut = path.join(OUTPUT_DIR, `${campaign.campaignId}_contact.png`);
  const propsPath = path.join(OUTPUT_DIR, `props_${campaign.campaignId}.json`);

  // The render contract is a plan. Existing campaign files are converted only
  // at this boundary so they remain valid without giving the renderer two APIs.
  const rawPlan = campaignToMotionPlan(campaign);
  const totalSeconds = rawPlan.scenes.reduce((max, scene) => Math.max(max, scene.start + scene.dur), 0);
  const preparedAudio = prepareAudioBed(rawPlan, totalSeconds, path.join(__dirname, "../.."), campaign.campaignId);
  const plan = preparedAudio.plan;
  fs.writeFileSync(propsPath, JSON.stringify({ plan }, null, 2));

  const totalFrames = Math.round(totalSeconds * 30);

  console.log(`\n=============================================================`);
  console.log(`🎬 Rendering Campaign: ${campaign.campaignId} ("${campaign.title}")`);
  console.log(`🎨 Brand: ${campaign.brand.name} | Primary: ${campaign.brand.primaryColor}`);
  console.log(`⏱️ Duration: ${totalFrames / 30}s (${totalFrames} frames @ 30 FPS)`);
  console.log(`🎵 Audio bed: ${preparedAudio.generated ? "generated" : "selected"} (${plan.audio.bed.mood}, ${plan.audio.bed.bpm} BPM)`);
  console.log(`📐 Aspect Ratio: ${campaign.aspectRatio}`);
  console.log(`=============================================================\n`);

  // 4. Render directly using the permanent Remotion Engine (Zero Code Touched)
  renderMotionPlan(plan, videoOut, propsPath);

  // 5. Generate Automated Quality Control Contact Sheet via FFmpeg (High-res 4x2 grid)
  console.log(`\nGenerating High-Res QC Contact Sheet: ${campaign.campaignId}_contact.png`);
  const ffmpegCmd = `ffmpeg -y -i ${videoOut} -vf "fps=1/${Math.max(1, Math.floor(totalFrames / 260))},scale=450:-1,tile=4x2" -frames:v 1 ${contactOut}`;
  execSync(ffmpegCmd, { stdio: "inherit" });

  console.log(`\n✔ Video Render Complete: ${videoOut}`);
  console.log(`✔ QC Contact Sheet: ${contactOut}`);
  console.log(`✔ Preserved Campaign Data: ${campaignJsonPath}\n`);

  return { videoOut, contactOut, campaignJsonPath };
}

// Standalone execution
if (require.main === module) {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error("Usage: npx tsx src/engine/runner.ts <path_to_campaign.json>");
    process.exit(1);
  }
  validateAndRender(fileArg);
}
