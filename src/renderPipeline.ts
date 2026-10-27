import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { CampaignSchema, CampaignConfig } from "./schema";
import { defaultCampaign } from "./sampleData";

const OUTPUT_DIR = path.join(__dirname, "../out");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function renderVariant(compositionId: string, outputName: string, props: { config: CampaignConfig }) {
  // Validate campaign data against schema
  CampaignSchema.parse(props.config);

  const propsPath = path.join(OUTPUT_DIR, `props_${compositionId}.json`);
  fs.writeFileSync(propsPath, JSON.stringify(props));

  const videoOut = path.join(OUTPUT_DIR, `${outputName}.mp4`);
  const contactSheetOut = path.join(OUTPUT_DIR, `${outputName}_contact.png`);

  console.log(`\n========================================`);
  console.log(`Rendering: ${compositionId} -> ${outputName}.mp4`);
  console.log(`========================================`);

  // 1. Render Video via Remotion CLI
  const remotionCmd = `npx remotion render src/index.tsx ${compositionId} ${videoOut} --props=${propsPath} --overwrite`;
  execSync(remotionCmd, { stdio: "inherit" });

  // 2. Generate Automated Quality Control Contact Sheet via FFmpeg
  console.log(`\nGenerating QC Contact Sheet: ${outputName}_contact.png`);
  const ffmpegCmd = `ffmpeg -y -i ${videoOut} -vf "fps=1,scale=270:-1,tile=4x2" -frames:v 1 ${contactSheetOut}`;
  execSync(ffmpegCmd, { stdio: "inherit" });

  console.log(`✔ Completed: ${videoOut}`);
  console.log(`✔ Contact Sheet: ${contactSheetOut}`);
}

async function main() {
  console.log("Starting Automated Motion Production Pipeline...\n");

  // Render 16:9 Landscape
  await renderVariant("Promo-16x9", "aura_promo_16x9", {
    config: { ...defaultCampaign, aspectRatio: "16:9" },
  });

  // Render 9:16 Vertical
  await renderVariant("Promo-9x16", "aura_promo_9x16", {
    config: { ...defaultCampaign, aspectRatio: "9:16" },
  });

  // Render 1:1 Square
  await renderVariant("Promo-1x1", "aura_promo_1x1", {
    config: { ...defaultCampaign, aspectRatio: "1:1" },
  });

  console.log("\nAll campaign formats rendered successfully!");
}

main().catch((err) => {
  console.error("Pipeline error:", err);
  process.exit(1);
});
