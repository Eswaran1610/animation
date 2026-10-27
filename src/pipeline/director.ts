import { Brief, DirectorSceneType, SceneSpec, ScenesArtifact, ScenesArtifactSchema, ScriptArtifact, ScriptLine } from "./schema";

function containsNumber(text: string) { return /\b\d+(?:\.\d+)?[%xkKmMbB]?\b/.test(text); }
function containsPath(text: string) { return /(?:\/|\\|\.(?:php|js|json|yml|yaml|env)\b|upload|folder|file)/i.test(text); }
function containsDate(text: string) { return /\b(?:19|20)\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(text); }
function containsSteps(text: string) { return /\b(first|then|next|finally|step|disable|allowlist|update|monitor|review)\b/i.test(text); }

function chooseType(line: ScriptLine, previous: DirectorSceneType | undefined, counts: Map<DirectorSceneType, number>): DirectorSceneType {
  if (line.beat === "hook") return "kinetic_title";
  if (line.beat === "cta") return "cta_end";
  let candidate: DirectorSceneType;
  if (containsNumber(line.text)) candidate = "stat_counter";
  else if (containsDate(line.text)) candidate = "timeline";
  else if (containsPath(line.text)) candidate = "file_tree";
  else if (containsSteps(line.text) || line.beat === "detect_fix") candidate = "checklist";
  else if (line.beat === "mechanism") candidate = "flow_diagram";
  else candidate = "quote_card";
  if (candidate !== previous && (counts.get(candidate) || 0) < 3) return candidate;

  // Keep the closed vocabulary varied even when many claims have the same
  // semantic shape. The QA contract allows at most three of one archetype.
  const alternatives: DirectorSceneType[] = [
    "flow_diagram", "compare_split", "checklist", "timeline", "file_tree", "stat_counter", "quote_card",
  ];
  return alternatives
    .filter((type) => type !== previous && (counts.get(type) || 0) < 3)
    .sort((left, right) => (counts.get(left) || 0) - (counts.get(right) || 0))[0] || "quote_card";
}

function sceneProps(line: ScriptLine, type: DirectorSceneType) {
  if (type === "kinetic_title") return { lines: line.text.split(/\s+/), emphasis: line.emphasis };
  if (type === "stat_counter") {
    const number = line.text.match(/\d+(?:\.\d+)?/)?.[0] || "0";
    return { value: Number(number), unit: line.text.includes("%") ? "%" : "", label: line.text };
  }
  if (type === "flow_diagram") return { nodes: line.text.split(/,|\s+then\s+|\s+->\s+/i).map((part) => part.trim()).filter(Boolean).slice(0, 4), dangerIndex: 1 };
  if (type === "checklist") return { items: [line.text], sequence: "tick_in" };
  if (type === "file_tree") return { path: line.text.match(/[\w./\\-]+\.(?:php|js|json|yml|yaml|env)/i)?.[0] || "upload-folder/" };
  if (type === "timeline") return { event: line.text };
  if (type === "compare_split") return { before: "Before verification", after: line.text };
  if (type === "quote_card") return { quote: line.text, sourceTag: "RESEARCHED CLAIM" };
  return {};
}

function allocateDurations(count: number, target: number): number[] {
  if (target / count < 2.5 || target / count > 6) {
    throw new Error(`Director cannot fit ${count} scenes into ${target}s: each scene must be 2.5–6s.`);
  }
  const exact = target / count;
  return Array.from({ length: count }, () => Math.round(exact * 100) / 100);
}

export function buildScenesArtifact(brief: Brief, script: ScriptArtifact, fps = 30, theme = "dark-ember"): ScenesArtifact {
  const durations = allocateDurations(script.lines.length, brief.durationSeconds);
  let previousType: DirectorSceneType | undefined;
  const counts = new Map<DirectorSceneType, number>();
  const scenes: SceneSpec[] = script.lines.map((line, index) => {
    const type = chooseType(line, previousType, counts);
    previousType = type;
    counts.set(type, (counts.get(type) || 0) + 1);
    return {
      id: `scene-${index + 1}`,
      type,
      beat: line.beat,
      voice: line.text,
      props: sceneProps(line, type),
      claimIds: line.claimIds,
      transitionOut: (["push_up", "push_left", "fade", "wipe", "zoom"] as const)[index % 5],
      durationSeconds: durations[index],
    };
  });

  return ScenesArtifactSchema.parse({
    meta: { fps, width: brief.aspectRatio === "16:9" ? 1920 : 1080, height: brief.aspectRatio === "1:1" ? 1080 : 1920, theme },
    scenes,
  });
}
