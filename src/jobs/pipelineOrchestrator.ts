/**
 * Claim-linked UI pipeline:
 * Gemini grounded research -> source-linked script -> closed scene plan ->
 * ElevenLabs/OpenAI voiceover -> Remotion render -> ffprobe validation.
 */

import fs from "fs";
import path from "path";
import {
  VideoJob,
  advanceStage,
  failJob,
  getJob,
  updateJob,
} from "./jobStore";
import { Brief, BriefSchema } from "../pipeline/schema";
import { parseBrief, slugify } from "../pipeline/brief";
import { researchBrief } from "../pipeline/research";
import { buildCodexScriptArtifact, buildDynamicScriptArtifact } from "../pipeline/writer";
import { codexAvailable, codexResearch } from "../ai/codexCli";
import { buildScenesArtifact } from "../pipeline/director";
import { buildTiming, timingToSrt } from "../pipeline/timing";
import { assertQualityGates, runQualityGates } from "../pipeline/qa";
import { scenesToCampaign } from "../pipeline/campaignAdapter";
import { generateVoiceover } from "../tts/ttsAdapter";
import { CampaignDataSchema } from "../engine/schema";
import {
  CAMPAIGNS_DIR,
  OUTPUT_DIR,
  createContactSheet,
  ensureVideoDirectories,
  probeVideo,
  renderComposition,
} from "../render/videoPipeline";

function makeBrief(job: VideoJob): Brief {
  try {
    return parseBrief(job.instructions);
  } catch {
    const lines = job.instructions.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return BriefSchema.parse({
      topic: lines[0] || job.instructions.slice(0, 120),
      angle: lines[1] || "Explain the verified mechanism, impact, and safest next step.",
      audience: job.settings.audience || "Technical viewers",
      format: `${job.settings.targetDurationSeconds}s ${job.settings.aspectRatio}, ${job.settings.theme || "cyber"} motion graphics`,
      durationSeconds: job.settings.targetDurationSeconds,
      aspectRatio: job.settings.aspectRatio,
      tone: job.settings.style || "calm and clear",
      language: "English",
    });
  }
}

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n");
}

function checkCancelled(id: string) {
  const current = getJob(id);
  if (current?.cancelRequested || current?.stage === "cancelled") throw new Error(`Job ${id} was cancelled.`);
}

export async function orchestrateClaimLinkedJob(job: VideoJob): Promise<void> {
  const { id } = job;
  const geminiKey = job.settings.geminiApiKey || process.env.GEMINI_API_KEY;
  const aiKey = geminiKey || process.env.OPENAI_API_KEY;
  const useCodex = job.settings.pipelineMode === "codex-local";
  const brief = makeBrief(job);
  const artifactDirectory = path.join(OUTPUT_DIR, "pipeline", `${slugify(brief.topic)}-${id}`);
  fs.mkdirSync(artifactDirectory, { recursive: true });

  try {
    if (useCodex && !codexAvailable()) throw new Error("Local Codex CLI is not available. Install/login to Codex before starting the job.");
    if (!useCodex && !aiKey) throw new Error("Configure GEMINI_API_KEY or OPENAI_API_KEY for AI research and script generation.");
    ensureVideoDirectories();

    advanceStage(id, "researching", 10);
    checkCancelled(id);
    const research = useCodex ? codexResearch(brief) : await researchBrief(brief, geminiKey);
    if (!research.claims.length) throw new Error(`${useCodex ? "Local Codex" : "AI"} research returned no verified claims. Confirm web access and try a more specific topic.`);
    writeJson(path.join(artifactDirectory, "brief.json"), brief);
    writeJson(path.join(artifactDirectory, "research.json"), research);
    updateJob(id, {
      sources: research.sources.map((source) => ({ ...source })),
      researchSummary: research.summary,
      pipelineArtifactDirectory: artifactDirectory,
    });
    advanceStage(id, "researching", 25);

    checkCancelled(id);
    advanceStage(id, "scripting", 30);
    const script = useCodex ? buildCodexScriptArtifact(brief, research) : await buildDynamicScriptArtifact(brief, research, geminiKey);
    writeJson(path.join(artifactDirectory, "script.json"), script);
    updateJob(id, { videoTitle: script.videoTitle, script: script.narrationScript });
    advanceStage(id, "scripting", 40);

    checkCancelled(id);
    advanceStage(id, "voiceover", 45);
    const voice = await generateVoiceover(script.narrationScript, id, undefined, { allowLocal: true });
    if (!voice.audioPath) {
      throw new Error("No audible voiceover was generated. Configure ElevenLabs/OpenAI or install espeak-ng.");
    }
    const audioTrack = `audio/${path.basename(voice.audioPath)}`;
    updateJob(id, {
      voiceoverPath: voice.audioPath,
      voiceoverDurationSeconds: voice.durationSeconds,
      voiceProvider: voice.provider,
    });
    advanceStage(id, "voiceover", 55);

    checkCancelled(id);
    advanceStage(id, "planning_scenes", 60);
    const scenes = buildScenesArtifact(brief, script, job.settings.fps, job.settings.theme === "claude" ? "dark-ember" : "cyber");
    const timing = buildTiming(script, scenes);
    const qa = runQualityGates(brief, research, script, scenes, timing);
    assertQualityGates(qa);
    writeJson(path.join(artifactDirectory, "scenes.json"), scenes);
    writeJson(path.join(artifactDirectory, "timing.json"), timing);
    writeJson(path.join(artifactDirectory, "qa.json"), qa);
    fs.writeFileSync(path.join(artifactDirectory, "captions.srt"), timingToSrt(timing));
    updateJob(id, {
      scenePlan: scenes.scenes.map((scene) => ({
        id: scene.id,
        durationSeconds: scene.durationSeconds,
        component: scene.type,
        narration: scene.voice,
        onScreenText: scene.voice,
        visualDirection: scene.type,
        sourceIds: scene.claimIds,
        type: scene.type,
      })),
    });
    advanceStage(id, "planning_scenes", 65);

    checkCancelled(id);
    const campaign = CampaignDataSchema.parse(
      scenesToCampaign(brief, scenes, id, audioTrack),
    );
    const campaignPath = path.join(artifactDirectory, "campaign.json");
    writeJson(campaignPath, campaign);
    const campaignJsonPath = path.join(CAMPAIGNS_DIR, `${id}.json`);
    writeJson(campaignJsonPath, campaign);

    advanceStage(id, "rendering", 70);
    const videoOut = path.join(OUTPUT_DIR, `${id}.mp4`);
    const propsPath = path.join(OUTPUT_DIR, `props_${id}.json`);
    writeJson(propsPath, { campaign });
    const totalFrames = campaign.scenes.reduce((sum, scene) => sum + Math.round(scene.durationSeconds * campaign.fps), 0);
    renderComposition({
      compositionId: "Universal-Motion-Engine",
      outputPath: videoOut,
      propsPath,
      frames: `0-${totalFrames - 1}`,
      timeoutMs: 120000,
      concurrency: 2,
    });
    advanceStage(id, "rendering", 85, { outputVideoPath: videoOut, outputVideoUrl: `/out/${path.basename(videoOut)}` });

    checkCancelled(id);
    advanceStage(id, "validating", 90);
    const stat = fs.statSync(videoOut);
    const probe = probeVideo(videoOut);
    if (!probe.hasVideoStream || stat.size < 10000) throw new Error("Rendered MP4 failed validation.");
    const contactOut = path.join(OUTPUT_DIR, `${id}_contact.png`);
    createContactSheet({
      videoPath: videoOut,
      outputPath: contactOut,
      sampleEverySeconds: Math.max(1, Math.floor(probe.durationSeconds / campaign.scenes.length)),
      tile: `${Math.min(5, campaign.scenes.length)}x${Math.ceil(campaign.scenes.length / Math.min(5, campaign.scenes.length))}`,
      stdio: "pipe",
    });
    advanceStage(id, "completed", 100, {
      validationPassed: true,
      validationDetails: `Valid MP4: ${probe.durationSeconds.toFixed(1)}s, ${probe.fps.toFixed(0)} FPS, ${(stat.size / 1024 / 1024).toFixed(1)} MB; voice: ${voice.provider}`,
      outputDurationSeconds: probe.durationSeconds,
      outputFps: probe.fps,
      outputResolution: probe.width && probe.height ? `${probe.width}x${probe.height}` : undefined,
      outputFileSizeBytes: stat.size,
      completedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    const current = getJob(id);
    if (current?.stage === "cancelled" || error.message?.includes("cancelled")) return;
    failJob(id, error.message || "Claim-linked pipeline failed", current?.stage || "failed");
    console.error(`[Pipeline] Job ${id} failed:`, error);
  }
}
