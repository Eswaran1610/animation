/**
 * TTS (Text-to-Speech) adapter.
 * Priority:
 *   1. ElevenLabs TTS      (ELEVENLABS_API_KEY)
 *   2. OpenAI TTS          (OPENAI_API_KEY)
 *   3. Local espeak-ng      (UI pipeline opt-in, no API key required)
 *   4. Timing estimate      (legacy callers only)
 *
 * Returns: path to saved audio file + estimated duration in seconds.
 */

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

// Remotion staticFile() can only serve public assets. Keeping generated audio
// here makes the voiceover part of the final MP4 instead of silently falling
// back to the ambient track.
const AUDIO_DIR = path.join(__dirname, "../../public/audio");
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

export interface TTSResult {
  audioPath: string | null;
  durationSeconds: number;
  provider: string;
  fallback: boolean;
}

// Rough estimate: average speech rate is ~150 words/min = 2.5 words/sec
function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(5, words / 2.5);
}

function audioDurationSeconds(outputPath: string, fallbackText: string): number {
  try {
    const value = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", outputPath],
      { encoding: "utf-8" },
    ).trim();
    const duration = Number(value);
    if (Number.isFinite(duration) && duration > 0) return duration;
  } catch {
    // Use the speech-rate estimate if ffprobe is unavailable.
  }
  return estimateDuration(fallbackText);
}

// ─── ElevenLabs TTS ──────────────────────────────────────────────────────────
async function elevenLabsTTS(
  text: string,
  outputPath: string,
  apiKey: string
): Promise<TTSResult | null> {
  try {
    // Use a stable voice: "Adam" (pNInz6obpgDQGcFmaJgB)
    const voiceId = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(outputPath, audioBuffer);
    const durationSeconds = audioDurationSeconds(outputPath, text);
    return { audioPath: outputPath, durationSeconds, provider: "elevenlabs", fallback: false };
  } catch {
    return null;
  }
}

// ─── OpenAI TTS ──────────────────────────────────────────────────────────────
async function openAiTTS(
  text: string,
  outputPath: string,
  apiKey: string
): Promise<TTSResult | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1-hd",
        input: text,
        voice: "onyx",
        response_format: "mp3",
      }),
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(outputPath, audioBuffer);
    const durationSeconds = audioDurationSeconds(outputPath, text);
    return { audioPath: outputPath, durationSeconds, provider: "openai-tts", fallback: false };
  } catch {
    return null;
  }
}

// ─── Local non-Google voice fallback ─────────────────────────────────────────
async function localEspeakTTS(text: string, jobId: string): Promise<TTSResult | null> {
  const outputPath = path.join(AUDIO_DIR, `${jobId}_voiceover.wav`);
  try {
    execFileSync("espeak-ng", ["-w", outputPath, "-s", "150", "-v", "en-us", text], { stdio: "ignore" });
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) return null;
    return {
      audioPath: outputPath,
      durationSeconds: audioDurationSeconds(outputPath, text),
      provider: "local-espeak-ng",
      fallback: false,
    };
  } catch {
    return null;
  }
}

// ─── Main TTS function ────────────────────────────────────────────────────────
export async function generateVoiceover(
  narrationScript: string,
  jobId: string,
  geminiApiKey?: string,
  options: { allowLocal?: boolean } = {},
): Promise<TTSResult> {
  const outputPath = path.join(AUDIO_DIR, `${jobId}_voiceover.mp3`);

  const elevenKey = process.env.ELEVENLABS_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Try providers in order
  let result: TTSResult | null = null;

  if (elevenKey && !result) {
    console.log("[TTS] Trying ElevenLabs TTS...");
    result = await elevenLabsTTS(narrationScript, outputPath, elevenKey);
    if (result) console.log(`[TTS] ElevenLabs succeeded. Duration: ${result.durationSeconds.toFixed(1)}s`);
  }

  if (openaiKey && !result) {
    console.log("[TTS] Trying OpenAI TTS...");
    result = await openAiTTS(narrationScript, outputPath, openaiKey);
    if (result) console.log(`[TTS] OpenAI TTS succeeded. Duration: ${result.durationSeconds.toFixed(1)}s`);
  }

  if (options.allowLocal && !result) {
    console.log("[TTS] Trying local espeak-ng voice...");
    result = await localEspeakTTS(narrationScript, jobId);
    if (result) console.log(`[TTS] Local espeak-ng succeeded. Duration: ${result.durationSeconds.toFixed(1)}s`);
  }

  // Fallback: estimate timing only, no actual audio file
  if (!result) {
    const estimated = estimateDuration(narrationScript);
    console.log(
      `[TTS] No TTS provider configured. Using timing estimate: ${estimated.toFixed(1)}s. ` +
        `Set ELEVENLABS_API_KEY or OPENAI_API_KEY for a real audible voiceover.`
    );
    return {
      audioPath: null,
      durationSeconds: estimated,
      provider: "estimated",
      fallback: true,
    };
  }

  return result;
}

/**
 * Align scene durations to voiceover total duration.
 * Distributes time proportionally based on narration word counts.
 */
export function alignScenesToAudio(
  scenes: Array<{ id: string; narration: string; durationSeconds: number }>,
  totalAudioDurationSeconds: number,
  fps: number
): Array<{ id: string; durationSeconds: number; startFrame: number; endFrame: number }> {
  // Calculate word counts for proportional distribution
  const wordCounts = scenes.map((s) =>
    Math.max(10, s.narration.trim().split(/\s+/).length)
  );
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);

  let currentFrame = 0;
  return scenes.map((scene, i) => {
    const proportion = wordCounts[i] / totalWords;
    const durationSeconds = Math.max(
      2,
      Math.round((totalAudioDurationSeconds * proportion) * 10) / 10
    );
    const durationFrames = Math.round(durationSeconds * fps);
    const startFrame = currentFrame;
    const endFrame = currentFrame + durationFrames - 1;
    currentFrame += durationFrames;
    return { id: scene.id, durationSeconds, startFrame, endFrame };
  });
}
