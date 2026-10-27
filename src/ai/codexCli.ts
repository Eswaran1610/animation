import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import {
  Brief,
  BriefSchema,
  ClaimSchema,
  ResearchArtifact,
  ResearchArtifactSchema,
  ScriptArtifact,
  ScriptArtifactSchema,
} from "../pipeline/schema";

const PROJECT_ROOT = path.join(__dirname, "../..");
const RESEARCH_SCHEMA = path.join(__dirname, "codexResearch.schema.json");
const SCRIPT_SCHEMA = path.join(__dirname, "codexScript.schema.json");

function parseJson(raw: string): any {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try { return JSON.parse(cleaned); } catch { /* try the first JSON object below */ }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
  throw new Error("Codex returned non-JSON output.");
}

function runCodex(prompt: string, schemaPath: string): any {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "motion-codex-"));
  const outputPath = path.join(tempDirectory, "last-message.json");
  try {
    const args = [
      // `--search` is a global Codex flag and must appear before `exec`.
      // Without it, Codex can still return valid JSON but has no live web tool,
      // which produces an empty research artifact.
      "--search",
      "exec",
      "--ephemeral",
      // Codex currently initializes its local app-server runtime with a small
      // writable state/config surface. Keep it scoped to the project and /tmp;
      // the prompt explicitly forbids source edits and the output is schema-bound.
      "--sandbox", "workspace-write",
      "--ignore-user-config",
      "--skip-git-repo-check",
      "--color", "never",
      "--output-schema", schemaPath,
      "--output-last-message", outputPath,
      "-C", PROJECT_ROOT,
      prompt,
    ];
    execFileSync("codex", args, { cwd: PROJECT_ROOT, encoding: "utf-8", timeout: 240000, stdio: "pipe" });
    if (!fs.existsSync(outputPath)) throw new Error("Codex did not write a final response.");
    return parseJson(fs.readFileSync(outputPath, "utf-8"));
  } catch (error: any) {
    const stderr = String(error.stderr || error.stdout || error.message || "").replace(/\s+/g, " ").slice(0, 500);
    throw new Error(`Local Codex failed: ${stderr}`);
  } finally {
    // The output is temporary and contains only the structured response.
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
}

export function codexAvailable(): boolean {
  try {
    execFileSync("codex", ["--version"], { stdio: "ignore", timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

export function codexResearch(brief: Brief): ResearchArtifact {
  const raw = runCodex(`You are the research agent for a factual motion video.
Use web search through your available tools. Do not answer from memory. Search official documentation, primary sources, reputable reporting, and original research. Open the pages and extract evidence.

BRIEF
Topic: ${brief.topic}
Angle: ${brief.angle}
Audience: ${brief.audience}
Format: ${brief.format}

Return ONLY JSON matching the supplied schema. Include at least 4 real source URLs and at least 6 atomic claims. Every claim must reference source IDs from the sources array. Never invent URLs, dates, numbers, CVEs, or quotes. If web search is unavailable, return an empty sources/claims result rather than guessing.`, RESEARCH_SCHEMA);
  const now = new Date().toISOString();
  const sources = (Array.isArray(raw.sources) ? raw.sources : []).map((source: any, index: number) => ({
    id: String(source.id || `codex-source-${index + 1}`),
    title: String(source.title || source.url || "Untitled source"),
    url: String(source.url || ""),
    publisher: source.publisher ? String(source.publisher) : undefined,
    publicationDate: source.publicationDate ? String(source.publicationDate) : undefined,
    retrievedAt: String(source.retrievedAt || now),
    supportsClaims: Array.isArray(source.supportsClaims) ? source.supportsClaims.map(String) : [],
  }));
  const validSourceIds = new Set(sources.map((source) => source.id));
  const claims = (Array.isArray(raw.claims) ? raw.claims : [])
    .map((claim: any, index: number) => ({
      id: String(claim.id || `claim-${index + 1}`),
      text: String(claim.text || ""),
      sources: Array.isArray(claim.sources) ? claim.sources.map(String).filter((id: string) => validSourceIds.has(id)) : [],
      date: claim.date ? String(claim.date) : undefined,
      confidence: claim.confidence || "single_source",
      type: claim.type || "other",
    }))
    .map((claim: any) => ClaimSchema.safeParse(claim))
    .filter((claim: any) => claim.success)
    .map((claim: any) => claim.data);
  const artifact = ResearchArtifactSchema.parse({
    generatedAt: now,
    queries: Array.isArray(raw.queries) && raw.queries.length ? raw.queries.map(String) : [brief.topic],
    summary: String(raw.summary || ""),
    sources,
    claims,
    stats: Array.isArray(raw.stats) ? raw.stats : [],
    timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
    fixes: Array.isArray(raw.fixes) ? raw.fixes : [],
  });
  if (!artifact.sources.length || !artifact.claims.length) {
    throw new Error("Local Codex returned no verified web sources or claims. Confirm Codex web access and try again.");
  }
  return artifact;
}

export function codexScript(brief: Brief, research: ResearchArtifact): ScriptArtifact {
  const claimText = research.claims
    .map((claim) => `- ${claim.id}: ${claim.text} (sources: ${claim.sources.join(", ")})`)
    .join("\n");
  const raw = runCodex(`Write a natural voice-over script for this ${brief.durationSeconds}-second video.
Topic: ${brief.topic}
Angle: ${brief.angle}
Audience: ${brief.audience}
Tone: ${brief.tone}

Use ONLY these verified claims. Every factual line must cite exact claim IDs. Hook and CTA may use an empty claimIds array. Keep each line under 18 spoken words. Start with hook and end with cta. Allowed beats: hook, context, mechanism, impact, detect_fix, cta.

VERIFIED CLAIMS
${claimText}

Return ONLY JSON matching the supplied schema.`, SCRIPT_SCHEMA);
  return ScriptArtifactSchema.parse({
    videoTitle: String(raw.videoTitle || brief.topic),
    targetAudience: String(raw.targetAudience || brief.audience),
    targetDurationSeconds: brief.durationSeconds,
    lines: raw.lines,
    narrationScript: String(raw.narrationScript || (raw.lines || []).map((line: any) => line.text).join(" ")),
  });
}
