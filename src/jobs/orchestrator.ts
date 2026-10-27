/**
 * Job orchestrator: drives the full async pipeline.
 * queued → researching → scripting → voiceover → planning_scenes → rendering → validating → completed
 *
 * Checks cancelRequested at each stage boundary.
 * Validates final MP4 with ffprobe.
 */

import fs from "fs";
import path from "path";
import {
  VideoJob,
  advanceStage,
  failJob,
  updateJob,
  getJob,
  ScenePlan,
} from "../jobs/jobStore";
import { researchTopic } from "../research/researchAdapter";
import { generateScriptPlan } from "../script/scriptGenerator";
import { generateVoiceover, alignScenesToAudio } from "../tts/ttsAdapter";
import { CampaignDataSchema } from "../engine/schema";
import {
  CAMPAIGNS_DIR,
  OUTPUT_DIR,
  createContactSheet,
  ensureVideoDirectories,
  probeVideo,
  renderComposition,
} from "../render/videoPipeline";

ensureVideoDirectories();

function checkCancelled(job: VideoJob): void {
  const fresh = getJob(job.id);
  if (fresh?.cancelRequested || fresh?.stage === "cancelled") {
    throw new Error(`Job ${job.id} was cancelled.`);
  }
}

function isCancelledError(err: Error): boolean {
  return err.message.includes("cancelled");
}

export async function orchestrateJob(job: VideoJob): Promise<void> {
  const { id, instructions, settings } = job;
  const gemKey = settings.geminiApiKey;

  try {
    // ── Stage 1: Research ─────────────────────────────────────────────────────
    advanceStage(id, "researching", 10);
    checkCancelled(getJob(id)!);

    const researchResult = await researchTopic(instructions, gemKey);

    advanceStage(id, "researching", 20, {
      sources: researchResult.sources,
      researchSummary: researchResult.summary,
    });

    // ── Stage 2: Script generation ───────────────────────────────────────────
    checkCancelled(getJob(id)!);
    advanceStage(id, "scripting", 30);

    const scriptPlan = await generateScriptPlan(
      instructions,
      researchResult.summary,
      researchResult.sources,
      {
        targetDurationSeconds: settings.targetDurationSeconds,
        fps: settings.fps,
        aspectRatio: settings.aspectRatio,
        theme: settings.theme,
        audience: undefined,
        style: undefined,
        geminiApiKey: gemKey,
      }
    );

    advanceStage(id, "scripting", 40, {
      videoTitle: scriptPlan.videoTitle,
      script: scriptPlan.narrationScript,
    });

    // ── Stage 3: Voice-over ───────────────────────────────────────────────────
    checkCancelled(getJob(id)!);
    advanceStage(id, "voiceover", 50);

    const ttsResult = await generateVoiceover(scriptPlan.narrationScript, id, gemKey);

    advanceStage(id, "voiceover", 55, {
      voiceoverPath: ttsResult.audioPath || undefined,
      voiceoverDurationSeconds: ttsResult.durationSeconds,
    });

    // ── Stage 4: Align scenes to audio / timing ──────────────────────────────
    checkCancelled(getJob(id)!);
    advanceStage(id, "planning_scenes", 60);

    let scenePlan: ScenePlan[];
    if (ttsResult.audioPath && ttsResult.durationSeconds > 0) {
      // Real voiceover audio present: align scenes to audio duration
      const alignedTimings = alignScenesToAudio(
        scriptPlan.scenes.map((s) => ({
          id: s.id,
          narration: s.narration,
          durationSeconds: s.durationSeconds,
        })),
        ttsResult.durationSeconds,
        settings.fps
      );
      scenePlan = scriptPlan.scenes.map((scene, i) => ({
        ...scene,
        durationSeconds: alignedTimings[i].durationSeconds,
      }));
    } else {
      // Fallback mode (no audio file): preserve the planned scene durations
      scenePlan = scriptPlan.scenes.map((scene) => ({
        ...scene,
        durationSeconds: scene.durationSeconds,
      }));
    }

    advanceStage(id, "planning_scenes", 65, { scenePlan });

    // ── Stage 5: Build campaign data for Remotion ────────────────────────────
    checkCancelled(getJob(id)!);

    // Map our scene plan to CampaignData schema
    const campaignData = {
      campaignId: id,
      title: scriptPlan.videoTitle,
      brand: {
        name: scriptPlan.brandName,
        primaryColor: scriptPlan.primaryColor,
        accentColor: scriptPlan.accentColor,
        backgroundColor: scriptPlan.backgroundColor,
        theme: (scriptPlan.theme as any) || "cyber",
      },
      aspectRatio: scriptPlan.aspectRatio,
      fps: settings.fps,
      ctaText: "Learn More →",
      audioTrack: ttsResult.audioPath
        ? `audio/${path.basename(ttsResult.audioPath)}`
        : "cyber_audio.wav",
      scenes: scenePlan.map((s) => ({
        id: s.id,
        type: s.type as any,
        tag: s.tag || "INFO",
        headline: s.onScreenText || s.narration.slice(0, 70),
        accentWord: s.accentWord,
        subtitle: s.subtitle,
        description: s.narration,
        terminalCommand: s.terminalCommand,
        terminalOutput: s.terminalOutput,
        terminalAlert: s.terminalAlert,
        beforeAfter: s.beforeAfter,
        items: s.items,
        metricTarget: s.metricTarget,
        metricSuffix: s.metricSuffix,
        metricLabel: s.metricLabel,
        secondaryMetricValue: s.secondaryMetricValue,
        secondaryMetricLabel: s.secondaryMetricLabel,
        ctaHeadline: s.ctaHeadline,
        trustBadges: s.trustBadges,
        nodeLeft: s.nodeLeft,
        nodeCenter: s.nodeCenter,
        nodeRight: s.nodeRight,
        durationSeconds: s.durationSeconds,
      })),
    };

    // Validate with existing schema
    const validationResult = CampaignDataSchema.safeParse(campaignData);
    if (!validationResult.success) {
      console.error("[Orchestrator] Campaign validation failed:", JSON.stringify(validationResult.error.format(), null, 2));
      throw new Error(`Scene plan validation failed: ${validationResult.error.issues.map(i => i.message).join(", ")}`);
    }

    const campaign = validationResult.data;

    // Save campaign JSON
    const campaignJsonPath = path.join(CAMPAIGNS_DIR, `${id}.json`);
    fs.writeFileSync(campaignJsonPath, JSON.stringify(campaign, null, 2));

    // ── Stage 6: Render ───────────────────────────────────────────────────────
    checkCancelled(getJob(id)!);
    advanceStage(id, "rendering", 70);

    const videoOut = path.join(OUTPUT_DIR, `${id}.mp4`);
    const propsPath = path.join(OUTPUT_DIR, `props_${id}.json`);
    fs.writeFileSync(propsPath, JSON.stringify({ campaign }, null, 2));

    const totalFrames = campaign.scenes.reduce((acc, s) => acc + Math.round(s.durationSeconds * settings.fps), 0);

    console.log(`[Orchestrator] Rendering ${id}: ${totalFrames} frames @ ${settings.fps} FPS`);

    // Determine dimensions from aspect ratio
    let width = 1080, height = 1920;
    if (settings.aspectRatio === "16:9") { width = 1920; height = 1080; }
    else if (settings.aspectRatio === "1:1") { width = 1080; height = 1080; }

    renderComposition({
      compositionId: "Universal-Motion-Engine",
      outputPath: videoOut,
      propsPath,
      frames: `0-${totalFrames - 1}`,
      timeoutMs: 120000,
      concurrency: 2,
    });

    advanceStage(id, "rendering", 85, {
      outputVideoPath: videoOut,
      outputVideoUrl: `/out/${id}.mp4`,
    });

    // ── Stage 7: Validate output ──────────────────────────────────────────────
    checkCancelled(getJob(id)!);
    advanceStage(id, "validating", 90);

    let validationPassed = false;
    let validationDetails = "";

    if (!fs.existsSync(videoOut)) {
      validationDetails = "Output file does not exist after render.";
    } else {
      const stat = fs.statSync(videoOut);
      if (stat.size === 0) {
        validationDetails = "Output file is empty (0 bytes).";
      } else {
        // Run ffprobe validation
        try {
          const probe = probeVideo(videoOut);
          const formatDuration = probe.durationSeconds;
          const detectedFps = probe.fps;

          const expectedDuration = ttsResult.audioPath
            ? ttsResult.durationSeconds
            : campaign.scenes.reduce((acc, s) => acc + s.durationSeconds, 0);

          const issues: string[] = [];
          if (!probe.hasVideoStream) issues.push("No video stream found");
          if (stat.size < 1000) issues.push("File suspiciously small");
          if (formatDuration < expectedDuration * 0.5)
            issues.push(`Duration ${formatDuration.toFixed(1)}s shorter than expected ${expectedDuration.toFixed(1)}s`);

          if (issues.length === 0) {
            validationPassed = true;
            validationDetails = `✔ Valid MP4: ${formatDuration.toFixed(1)}s, ${detectedFps.toFixed(0)} FPS, ${(stat.size / 1024 / 1024).toFixed(1)} MB`;
          } else {
            validationDetails = `Issues: ${issues.join("; ")}`;
          }

          updateJob(id, {
            outputDurationSeconds: formatDuration,
            outputFps: detectedFps,
            outputFileSizeBytes: stat.size,
            outputResolution: probe.width && probe.height ? `${probe.width}x${probe.height}` : `${width}x${height}`,
          });
        } catch (probeErr: any) {
          // ffprobe failed: file exists and is non-empty, partial validation only
          validationPassed = stat.size > 10000;
          validationDetails = `ffprobe unavailable or failed: ${probeErr.message?.slice(0, 80)}. File size: ${(stat.size / 1024).toFixed(0)} KB.`;
          updateJob(id, {
            outputFileSizeBytes: stat.size,
            outputResolution: `${width}x${height}`,
          });
        }
      }
    }

    if (!validationPassed) {
      throw new Error(`Output validation failed: ${validationDetails}`);
    }

    // Generate QC contact sheet
    try {
      const contactOut = path.join(OUTPUT_DIR, `${id}_contact.png`);
      createContactSheet({
        videoPath: videoOut,
        outputPath: contactOut,
        sampleEverySeconds: Math.max(1, Math.floor(totalFrames / (settings.fps * campaign.scenes.length))),
        tile: `${Math.min(5, campaign.scenes.length)}x${Math.ceil(campaign.scenes.length / Math.min(5, campaign.scenes.length))}`,
        stdio: "pipe",
      });
    } catch {
      // Non-critical: contact sheet failure doesn't fail the job
    }

    // ── Completed ─────────────────────────────────────────────────────────────
    advanceStage(id, "completed", 100, {
      validationPassed,
      validationDetails,
      completedAt: new Date().toISOString(),
    });

    console.log(`[Orchestrator] ✔ Job ${id} completed: ${videoOut}`);
  } catch (err: any) {
    if (isCancelledError(err)) {
      console.log(`[Orchestrator] Job ${id} cancelled.`);
      return;
    }

    const currentJob = getJob(id);
    const currentStage = currentJob?.stage || "queued";
    console.error(`[Orchestrator] Job ${id} failed at stage '${currentStage}':`, err.message);
    failJob(id, err.message?.slice(0, 500) || "Unknown error", currentStage as any);
  }
}
