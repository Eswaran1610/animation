import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { CampaignDataSchema, CampaignData, SupportedSceneTypes } from "./schema";

const CAMPAIGNS_DIR = path.join(__dirname, "../../campaigns");
const OUTPUT_DIR = path.join(__dirname, "../../out");

if (!fs.existsSync(CAMPAIGNS_DIR)) fs.mkdirSync(CAMPAIGNS_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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

  fs.writeFileSync(propsPath, JSON.stringify({ campaign }, null, 2));

  const totalFrames = campaign.scenes.reduce((acc, s) => acc + s.durationSeconds * 30, 0);

  console.log(`\n=============================================================`);
  console.log(`🎬 Rendering Campaign: ${campaign.campaignId} ("${campaign.title}")`);
  console.log(`🎨 Brand: ${campaign.brand.name} | Primary: ${campaign.brand.primaryColor}`);
  console.log(`⏱️ Duration: ${totalFrames / 30}s (${totalFrames} frames @ 30 FPS)`);
  console.log(`📐 Aspect Ratio: ${campaign.aspectRatio}`);
  console.log(`=============================================================\n`);

  // 4. Render directly using the permanent Remotion Engine (Zero Code Touched)
  const renderCmd = `npx remotion render src/index.tsx Universal-Motion-Engine ${videoOut} --props=${propsPath} --frames=0-${totalFrames - 1} --overwrite`;
  execSync(renderCmd, { stdio: "inherit" });

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
