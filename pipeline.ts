#!/usr/bin/env node
import fs from "fs";
import { runPipeline } from "./src/pipeline/runPipeline";

function parseArgs(args: string[]) {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      flags[key] = value || "true";
    } else positional.push(arg);
  }
  return { brief: positional[0], flags };
}

async function main() {
  const { brief, flags } = parseArgs(process.argv.slice(2));
  if (!brief) {
    console.error("Usage: npx tsx pipeline.ts <brief.txt> --research=research.json [--render] [--fps=30] [--theme=dark-ember]");
    process.exit(1);
  }
  if (!fs.existsSync(brief)) throw new Error(`Brief file not found: ${brief}`);

  console.log("\n🎬 Dynamic AI Motion Video Pipeline\n");
  const result = await runPipeline({
    brief,
    research: flags.research,
    render: flags.render === "true",
    fps: flags.fps ? Number(flags.fps) : 30,
    theme: flags.theme || "dark-ember",
    audioTrack: flags.audio || "cyber_audio.wav",
  });

  console.log("✔ QA gates passed");
  console.log(`✔ Artifacts: ${result.directory}`);
  if (result.videoPath) console.log(`✔ Video: ${result.videoPath}`);
  console.log(`✔ Captions: ${result.captionsPath}`);
  console.log(`✔ Sources: ${result.sourcesPath}`);
}

main().catch((error) => {
  console.error(`\n❌ Pipeline failed: ${error.message}`);
  process.exit(1);
});
