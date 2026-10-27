import { Brief } from "./schema";
import { Claim, ResearchArtifact, ScriptArtifact, ScriptArtifactSchema, ScriptBeat, ScriptLine } from "./schema";
import { openAIResponses } from "../ai/openai";
import { codexScript } from "../ai/codexCli";

function words(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

function compactClaim(claim: Claim): string[] {
  const sourceWords = words(claim.text);
  const chunks: string[] = [];
  for (let index = 0; index < sourceWords.length; index += 14) {
    chunks.push(sourceWords.slice(index, index + 14).join(" "));
  }
  return chunks.length ? chunks : [claim.text];
}

function emphasisFor(text: string): string[] {
  return words(text)
    .filter((word) => word.replace(/[^a-z0-9]/gi, "").length >= 5)
    .slice(0, 3);
}

function addLine(lines: ScriptLine[], id: string, beat: ScriptBeat, text: string, claimIds: string[] = []) {
  lines.push({ id, beat, text, claimIds, emphasis: emphasisFor(text) });
}

function fitLineCount(lines: ScriptLine[], brief: Brief, research: ResearchArtifact): ScriptLine[] {
  const minimum = Math.ceil(brief.durationSeconds / 6);
  const maximum = Math.floor(brief.durationSeconds / 2.5);
  const cta = lines[lines.length - 1]?.beat === "cta" ? lines[lines.length - 1] : undefined;
  const body = cta ? lines.slice(0, -1) : lines.slice();
  const claims = research.claims.length ? research.claims : [{ id: "", text: brief.angle, sources: [], confidence: "low", type: "other" } as Claim];

  let next = body.slice(0, Math.max(1, maximum - (cta ? 1 : 0)));
  let index = 0;
  while (next.length + (cta ? 1 : 0) < minimum) {
    const claim = claims[index % claims.length];
    const text = compactClaim(claim)[0].slice(0, 118);
    next.push({
      id: `line-${next.length + 1}`,
      beat: index % 2 === 0 ? "context" : "impact",
      text,
      claimIds: claim.id ? [claim.id] : [],
      emphasis: emphasisFor(text),
    });
    index++;
  }
  if (cta) next.push({ ...cta, id: `line-${next.length + 1}` });
  return next;
}

export function buildScriptArtifact(brief: Brief, research: ResearchArtifact): ScriptArtifact {
  if (research.claims.length === 0) {
    throw new Error("Writer stopped: research.json contains no verified claims. Supply claims with source IDs before writing.");
  }

  const lines: ScriptLine[] = [];
  addLine(lines, "line-1", "hook", `${brief.topic}: what changed, and what should you do next?`);

  const contextClaims = research.claims.filter((claim) => claim.type === "context" || claim.type === "mechanism");
  const mechanismClaims = research.claims.filter((claim) => ["mechanism", "indicator"].includes(claim.type));
  const impactClaims = research.claims.filter((claim) => ["impact", "timeline"].includes(claim.type));

  const selected = [
    ...contextClaims.slice(0, 1),
    ...mechanismClaims.slice(0, 3),
    ...impactClaims.slice(0, 2),
  ];

  let lineNumber = 2;
  for (const claim of selected.length ? selected : research.claims.slice(0, 5)) {
    const beat: ScriptBeat = claim.type === "impact" || claim.type === "timeline" ? "impact" : claim.type === "fix" ? "detect_fix" : lineNumber <= 3 ? "context" : "mechanism";
    for (const chunk of compactClaim(claim).slice(0, 2)) {
      addLine(lines, `line-${lineNumber++}`, beat, chunk, [claim.id]);
    }
  }

  for (const fix of research.fixes.slice(0, 4)) {
    const claimIds = fix.claimIds.length ? fix.claimIds : research.claims.filter((claim) => claim.sources.includes(fix.source)).map((claim) => claim.id);
    if (claimIds.length) addLine(lines, `line-${lineNumber++}`, "detect_fix", fix.step, claimIds);
  }

  addLine(lines, `line-${lineNumber}`, "cta", "Use the sources, verify the exposure, and make the defensive fix.");
  const fittedLines = fitLineCount(lines, brief, research);

  const target = brief.durationSeconds;
  const script: ScriptArtifact = {
    videoTitle: brief.topic,
    targetAudience: brief.audience,
    targetDurationSeconds: target,
    lines: fittedLines,
    narrationScript: fittedLines.map((line) => line.text).join(" "),
  };
  return ScriptArtifactSchema.parse(script);
}

export function buildCodexScriptArtifact(brief: Brief, research: ResearchArtifact): ScriptArtifact {
  const script = codexScript(brief, research);
  const validClaimIds = new Set(research.claims.map((claim) => claim.id));
  const lines = script.lines.map((line) => ({
    ...line,
    claimIds: line.claimIds.filter((claimId) => validClaimIds.has(claimId)),
  }));
  if (!lines.length || lines[0].beat !== "hook" || lines[lines.length - 1].beat !== "cta") {
    throw new Error("Local Codex script must start with hook and end with cta.");
  }
  if (lines.some((line) => !["hook", "cta"].includes(line.beat) && !line.claimIds.length)) {
    throw new Error("Local Codex factual script line is missing a verified claim ID.");
  }
  const fittedLines = fitLineCount(lines, brief, research);
  return ScriptArtifactSchema.parse({
    ...script,
    targetDurationSeconds: brief.durationSeconds,
    lines: fittedLines,
    narrationScript: fittedLines.map((line) => line.text).join(" "),
  });
}

/**
 * Gemini writer for the localhost workflow. Gemini receives only the
 * source-linked claim register, then returns a compact spoken script whose
 * factual lines must carry claim IDs. The deterministic writer above remains
 * the safe fallback when Gemini is unavailable or returns malformed JSON.
 */
export async function buildDynamicScriptArtifact(
  brief: Brief,
  research: ResearchArtifact,
  apiKey?: string,
): Promise<ScriptArtifact> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (research.claims.length === 0) return buildScriptArtifact(brief, research);

  if (!key && process.env.OPENAI_API_KEY) {
    return buildOpenAIScriptArtifact(brief, research);
  }
  if (!key) return buildScriptArtifact(brief, research);

  const claims = research.claims
    .map((claim) => `- ${claim.id} [${claim.type}/${claim.confidence}]: ${claim.text} (sources: ${claim.sources.join(", ")})`)
    .join("\n");
  const prompt = `You are the scriptwriter for a factual ${brief.durationSeconds}-second motion video.
Write a natural, clearly spoken voice-over for this brief.
Topic: ${brief.topic}
Angle: ${brief.angle}
Audience: ${brief.audience}
Format and tone: ${brief.format}; ${brief.tone}

Use only the verified claims below. Never invent facts, figures, dates, versions, or URLs.
The hook and CTA may have an empty claimIds array. Every factual line must include one or more exact claim IDs.
Keep each line under 18 spoken words. Return 8–16 lines, start with beat "hook", end with beat "cta", and use these beats only: hook, context, mechanism, impact, detect_fix, cta.

VERIFIED CLAIMS:
${claims}

Return JSON only:
{"videoTitle":"...","targetAudience":"...","lines":[{"id":"line-1","beat":"hook","text":"...","claimIds":[],"emphasis":["..."]}],"narrationScript":"..."}`;

  try {
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.35, maxOutputTokens: 4096 },
        }),
      },
    );
    if (!response.ok) {
      const details = (await response.text()).replace(/\s+/g, " ").slice(0, 300);
      console.error(`[Writer][Gemini] ${response.status} using ${model}: ${details}`);
      return buildScriptArtifact(brief, research);
    }
    const payload: any = await response.json();
    const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return buildScriptArtifact(brief, research);
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    const validClaimIds = new Set(research.claims.map((claim) => claim.id));
    const lines = Array.isArray(parsed.lines)
      ? parsed.lines
        .map((line: any, index: number) => ({
          id: String(line.id || `line-${index + 1}`),
          beat: line.beat,
          text: String(line.text || "").trim(),
          claimIds: Array.isArray(line.claimIds) ? line.claimIds.filter((id: unknown) => validClaimIds.has(String(id))) : [],
          emphasis: Array.isArray(line.emphasis) ? line.emphasis.slice(0, 3).map(String) : [],
        }))
        .filter((line: ScriptLine) => line.text)
      : [];
    if (!lines.length || lines[0].beat !== "hook" || lines[lines.length - 1].beat !== "cta") {
      return buildScriptArtifact(brief, research);
    }
    for (const line of lines) {
      if (line.beat !== "hook" && line.beat !== "cta" && line.claimIds.length === 0) {
        return buildScriptArtifact(brief, research);
      }
    }
    const fittedLines = fitLineCount(lines, brief, research);
    return ScriptArtifactSchema.parse({
      videoTitle: String(parsed.videoTitle || brief.topic),
      targetAudience: String(parsed.targetAudience || brief.audience),
      targetDurationSeconds: brief.durationSeconds,
      lines: fittedLines,
      narrationScript: fittedLines.map((line: ScriptLine) => line.text).join(" "),
    });
  } catch (error: any) {
    console.warn(`[Writer] Gemini script generation failed; using claim-linked fallback: ${error.message?.slice(0, 120)}`);
    return buildScriptArtifact(brief, research);
  }
}

async function buildOpenAIScriptArtifact(brief: Brief, research: ResearchArtifact): Promise<ScriptArtifact> {
  const claims = research.claims
    .map((claim) => `- ${claim.id} [${claim.type}/${claim.confidence}]: ${claim.text} (sources: ${claim.sources.join(", ")})`)
    .join("\n");
  const response = await openAIResponses(`Write a natural, clearly spoken voice-over for this ${brief.durationSeconds}-second video.
Topic: ${brief.topic}
Angle: ${brief.angle}
Audience: ${brief.audience}
Tone: ${brief.tone}

Use only the verified claims below. Never invent facts, figures, dates, versions, or URLs.
Hook and CTA may have empty claimIds. Every factual line must include exact claim IDs.
Keep each line under 18 spoken words. Return 8–16 lines, first beat hook, last beat cta. Allowed beats: hook, context, mechanism, impact, detect_fix, cta.

VERIFIED CLAIMS:
${claims}

Return JSON only: {"videoTitle":"...","targetAudience":"...","lines":[{"id":"line-1","beat":"hook","text":"...","claimIds":[],"emphasis":[]}],"narrationScript":"..."}`, { maxOutputTokens: 4096 });
  const parsed = JSON.parse(response.text.replace(/```json|```/g, "").trim());
  const validClaimIds = new Set(research.claims.map((claim) => claim.id));
  const lines = Array.isArray(parsed.lines)
    ? parsed.lines.map((line: any, index: number) => ({
      id: String(line.id || `line-${index + 1}`),
      beat: line.beat,
      text: String(line.text || "").trim(),
      claimIds: Array.isArray(line.claimIds) ? line.claimIds.filter((id: unknown) => validClaimIds.has(String(id))) : [],
      emphasis: Array.isArray(line.emphasis) ? line.emphasis.slice(0, 3).map(String) : [],
    })).filter((line: ScriptLine) => line.text)
    : [];
  if (!lines.length || lines[0].beat !== "hook" || lines[lines.length - 1].beat !== "cta") return buildScriptArtifact(brief, research);
  if (lines.some((line: ScriptLine) => !["hook", "cta"].includes(line.beat) && !line.claimIds.length)) return buildScriptArtifact(brief, research);
  const fittedLines = fitLineCount(lines, brief, research);
  return ScriptArtifactSchema.parse({
    videoTitle: String(parsed.videoTitle || brief.topic),
    targetAudience: String(parsed.targetAudience || brief.audience),
    targetDurationSeconds: brief.durationSeconds,
    lines: fittedLines,
    narrationScript: fittedLines.map((line) => line.text).join(" "),
  });
}
