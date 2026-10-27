import fs from "fs";
import path from "path";
import { CampaignSchema, CampaignConfig } from "./schema";
import {
  OUTPUT_DIR,
  createContactSheet,
  ensureVideoDirectories,
  renderComposition,
} from "./render/videoPipeline";

ensureVideoDirectories();

// Read input from command line argument or standard input
function getCampaignInput(): CampaignConfig {
  const arg = process.argv[2];
  if (!arg) {
    throw new Error("No JSON payload provided. Usage: npx tsx src/generateFromPrompt.ts '<json_string>'");
  }

  let parsedData: any;
  if (fs.existsSync(arg)) {
    parsedData = JSON.parse(fs.readFileSync(arg, "utf-8"));
  } else {
    parsedData = JSON.parse(arg);
  }

  // Validate strictly against schema
  return CampaignSchema.parse(parsedData);
}

async function generate() {
  const config = getCampaignInput();
  console.log(`\nGenerating video campaign for: ${config.brand.name}...`);

  const propsPath = path.join(OUTPUT_DIR, `props_${config.id}.json`);
  fs.writeFileSync(propsPath, JSON.stringify({ config }, null, 2));

  // Determine composition
  let compId = "Promo-16x9";
  if (config.aspectRatio === "9:16") compId = "Promo-9x16";
  if (config.aspectRatio === "1:1") compId = "Promo-1x1";

  const videoOut = path.join(OUTPUT_DIR, `${config.id}_${config.aspectRatio.replace(":", "x")}.mp4`);
  const contactSheet = path.join(OUTPUT_DIR, `${config.id}_contact.png`);

  console.log(`\n1. Rendering ${compId} -> ${videoOut}`);
  renderComposition({
    compositionId: compId,
    outputPath: videoOut,
    propsPath,
  });

  console.log(`\n2. Generating Quality Control Sheet...`);
  createContactSheet({
    videoPath: videoOut,
    outputPath: contactSheet,
    scaleWidth: 270,
  });

  console.log(`\n✔ Video Ready: ${videoOut}`);
  console.log(`✔ QC Contact Sheet: ${contactSheet}\n`);
}

generate().catch((err) => {
  console.error("Generation error:", err.message);
  process.exit(1);
});
