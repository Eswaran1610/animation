import fs from "fs";
import path from "path";
import { validateAndRender } from "../engine/runner";
import { Brief, BriefSchema, ResearchArtifact, ResearchArtifactSchema } from "./schema";
import { parseBrief, slugify } from "./brief";
import { researchBrief, createResearchArtifact } from "./research";
import { buildScriptArtifact } from "./writer";
import { buildScenesArtifact } from "./director";
import { buildTiming, timingToSrt } from "./timing";
import { assertQualityGates, runQualityGates } from "./qa";
import { scenesToCampaign } from "./campaignAdapter";

export interface PipelineOptions {
  brief: string | Brief;
  research?: string | ResearchArtifact;
  outputRoot?: string;
  render?: boolean;
  fps?: number;
  theme?: string;
  geminiApiKey?: string;
  audioTrack?: string;
}

export interface PipelineResult {
  directory: string;
  briefPath: string;
  researchPath: string;
  scriptPath: string;
  scenesPath: string;
  timingPath: string;
  captionsPath: string;
  sourcesPath: string;
  qaPath: string;
  campaignPath: string;
  videoPath?: string;
  contactSheetPath?: string;
}

function readJson<T>(value: string): T {
  return JSON.parse(fs.readFileSync(value, "utf-8")) as T;
}

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function sourcesMarkdown(research: ResearchArtifact): string {
  const lines = ["# Sources", "", `Generated: ${research.generatedAt}`, ""];
  for (const source of research.sources) {
    lines.push(`- [${source.title}](${source.url})${source.publisher ? ` — ${source.publisher}` : ""}`);
    const claims = research.claims.filter((claim) => claim.sources.includes(source.id)).map((claim) => claim.id);
    if (claims.length) lines.push(`  - Supports: ${claims.join(", ")}`);
  }
  lines.push("", "## Claim register", "");
  for (const claim of research.claims) lines.push(`- **${claim.id}** (${claim.confidence}): ${claim.text}`);
  return lines.join("\n") + "\n";
}

export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const root = options.outputRoot || path.join(__dirname, "../../out");
  const brief = typeof options.brief === "string" && fs.existsSync(options.brief)
    ? parseBrief(fs.readFileSync(options.brief, "utf-8"))
    : parseBrief(options.brief);
  const slug = slugify(brief.topic);
  const directory = path.join(root, slug);
  fs.mkdirSync(directory, { recursive: true });

  const research = typeof options.research === "string"
    ? ResearchArtifactSchema.parse(readJson<unknown>(options.research))
    : options.research
      ? ResearchArtifactSchema.parse(options.research)
      : await researchBrief(brief, options.geminiApiKey);

  const script = buildScriptArtifact(brief, research);
  const fps = options.fps || 30;
  const scenes = buildScenesArtifact(brief, script, fps, options.theme || "dark-ember");
  const timing = buildTiming(script, scenes);
  const qa = runQualityGates(brief, research, script, scenes, timing);
  assertQualityGates(qa);

  const campaignId = `${slug}-${Date.now()}`;
  const campaign = scenesToCampaign(brief, scenes, campaignId, options.audioTrack || "cyber_audio.wav");
  const campaignPath = path.join(directory, "campaign.json");

  writeJson(path.join(directory, "brief.json"), brief);
  writeJson(path.join(directory, "research.json"), research);
  writeJson(path.join(directory, "script.json"), script);
  writeJson(path.join(directory, "scenes.json"), scenes);
  writeJson(path.join(directory, "timing.json"), timing);
  writeJson(path.join(directory, "qa.json"), qa);
  writeJson(campaignPath, campaign);
  fs.writeFileSync(path.join(directory, "captions.srt"), timingToSrt(timing));
  fs.writeFileSync(path.join(directory, "sources.md"), sourcesMarkdown(research));

  const result: PipelineResult = {
    directory,
    briefPath: path.join(directory, "brief.json"),
    researchPath: path.join(directory, "research.json"),
    scriptPath: path.join(directory, "script.json"),
    scenesPath: path.join(directory, "scenes.json"),
    timingPath: path.join(directory, "timing.json"),
    captionsPath: path.join(directory, "captions.srt"),
    sourcesPath: path.join(directory, "sources.md"),
    qaPath: path.join(directory, "qa.json"),
    campaignPath,
  };

  if (options.render) {
    const rendered = validateAndRender(campaign);
    const videoPath = path.join(directory, "final.mp4");
    const contactSheetPath = path.join(directory, "preview.png");
    fs.copyFileSync(rendered.videoOut, videoPath);
    fs.copyFileSync(rendered.contactOut, contactSheetPath);
    result.videoPath = videoPath;
    result.contactSheetPath = contactSheetPath;
  }

  return result;
}
