import { Brief, QAReport, QAReportSchema, ResearchArtifact, ScenesArtifact, ScriptArtifact, TimingArtifact } from "./schema";

function check(name: string, errors: string[] = [], warnings: string[] = []) {
  return { name, passed: errors.length === 0, errors, warnings };
}

export function runQualityGates(
  brief: Brief,
  research: ResearchArtifact,
  script: ScriptArtifact,
  scenes: ScenesArtifact,
  timing: TimingArtifact,
): QAReport {
  const sourceIds = new Set(research.sources.map((source) => source.id));
  const claimMap = new Map(research.claims.map((claim) => [claim.id, claim]));
  const claimErrors: string[] = [];
  const claimWarnings: string[] = [];

  for (const line of script.lines) {
    if (["hook", "cta"].includes(line.beat)) continue;
    if (!line.claimIds.length) claimErrors.push(`${line.id} has no claim_ids`);
    for (const claimId of line.claimIds) {
      const claim = claimMap.get(claimId);
      if (!claim) claimErrors.push(`${line.id} references missing claim ${claimId}`);
      else {
        if (!claim.sources.length) claimErrors.push(`${claimId} has no sources`);
        if (claim.sources.some((sourceId) => !sourceIds.has(sourceId))) claimErrors.push(`${claimId} references missing source`);
        if (claim.confidence === "single_source") claimWarnings.push(`${claimId} is single_source`);
      }
    }
  }

  const layoutErrors: string[] = [];
  for (const line of script.lines) {
    if (line.text.length > 120) layoutErrors.push(`${line.id} exceeds 120 characters`);
    if (line.emphasis.length > 3) layoutErrors.push(`${line.id} has more than 3 emphasis words`);
  }

  const timingErrors: string[] = [];
  const expected = brief.durationSeconds;
  const actual = timing.totalDurationSeconds;
  if (Math.abs(actual - expected) > expected * 0.05) timingErrors.push(`Total duration ${actual.toFixed(2)}s is outside 5% of ${expected}s`);
  for (const scene of scenes.scenes) {
    if (scene.durationSeconds < 2.5 || scene.durationSeconds > 6) timingErrors.push(`${scene.id} duration is outside 2.5–6s`);
  }

  const varietyErrors: string[] = [];
  for (let index = 1; index < scenes.scenes.length; index++) {
    if (scenes.scenes[index].type === scenes.scenes[index - 1].type) varietyErrors.push(`${scenes.scenes[index].id} repeats ${scenes.scenes[index].type} back to back`);
  }
  const counts = new Map<string, number>();
  for (const scene of scenes.scenes) counts.set(scene.type, (counts.get(scene.type) || 0) + 1);
  for (const [type, count] of counts) if (count > 3) varietyErrors.push(`${type} appears ${count} times; maximum is 3`);

  const safetyErrors: string[] = [];
  if (/shell|exploit|injection|vulnerability|cve/i.test(brief.topic)) {
    const allText = scenes.scenes.map((scene) => JSON.stringify(scene.props)).join(" ");
    if (/<?php|curl\s+[^ ]+\s+-d|powershell\s+-enc/i.test(allText)) safetyErrors.push("Potentially executable exploit content detected in scene props");
  }

  return QAReportSchema.parse({
    generatedAt: new Date().toISOString(),
    passed: [
      check("claim_check", claimErrors, claimWarnings),
      check("layout_lint", layoutErrors),
      check("timing_lint", timingErrors),
      check("variety_lint", varietyErrors),
      check("security_content_lint", safetyErrors),
    ].every((item) => item.passed),
    checks: [
      check("claim_check", claimErrors, claimWarnings),
      check("layout_lint", layoutErrors),
      check("timing_lint", timingErrors),
      check("variety_lint", varietyErrors),
      check("security_content_lint", safetyErrors),
    ],
  });
}

export function assertQualityGates(report: QAReport): void {
  if (!report.passed) {
    const errors = report.checks.flatMap((item) => item.errors);
    throw new Error(`QA gates failed: ${errors.join("; ")}`);
  }
}
