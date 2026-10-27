import { CampaignData } from "../engine/schema";
import { Brief, ScenesArtifact } from "./schema";

const colors = {
  "dark-ember": { primary: "#D97757", accent: "#F5F1E8", background: "#1A1916", theme: "claude" as const },
  cyber: { primary: "#10B981", accent: "#06B6D4", background: "#030712", theme: "cyber" as const },
};

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function scenesToCampaign(brief: Brief, scenes: ScenesArtifact, campaignId: string, audioTrack = "cyber_audio.wav"): CampaignData {
  const palette = colors[scenes.meta.theme as keyof typeof colors] || colors.cyber;
  return {
    campaignId,
    title: brief.topic,
    brand: { name: "Motion Studio", primaryColor: palette.primary, accentColor: palette.accent, backgroundColor: palette.background, theme: palette.theme },
    aspectRatio: brief.aspectRatio,
    fps: scenes.meta.fps,
    ctaText: "Review the sources and take the next safe step →",
    audioTrack,
    scenes: scenes.scenes.map((scene) => {
      const props = scene.props as Record<string, any>;
      const common = {
        id: scene.id,
        sourceSceneType: scene.type,
        tag: scene.beat.toUpperCase(),
        headline: scene.voice.slice(0, 80),
        description: scene.voice,
        durationSeconds: scene.durationSeconds,
      };
      if (scene.type === "kinetic_title") return { ...common, type: "kinetic_hook" as const, accentWord: textList(props.emphasis)[0] };
      if (scene.type === "stat_counter") return { ...common, type: "metric_counter" as const, metricTarget: Number(props.value) || 0, metricSuffix: String(props.unit || ""), metricLabel: String(props.label || scene.voice), secondaryMetricValue: "1", secondaryMetricLabel: "Source-linked claim" };
      if (scene.type === "flow_diagram") {
        const nodes = textList(props.nodes);
        return { ...common, type: "before_after_split" as const, beforeAfter: { beforeTitle: "Mechanism", beforeItems: nodes.slice(0, 3), afterTitle: "What to verify", afterItems: [scene.voice] } };
      }
      if (scene.type === "checklist") return { ...common, type: "feature_cards" as const, items: textList(props.items).length ? textList(props.items) : [scene.voice] };
      if (scene.type === "timeline") return { ...common, type: "feature_cards" as const, items: [String(props.event || scene.voice)] };
      if (scene.type === "file_tree") return { ...common, type: "terminal_code" as const, terminalTitle: "FILE TREE", terminalCommand: String(props.path || "upload-folder/"), terminalOutput: scene.voice, terminalAlert: "PATH REQUIRES REVIEW" };
      if (scene.type === "quote_card") return { ...common, type: "feature_cards" as const, items: [String(props.quote || scene.voice)] };
      if (scene.type === "cta_end") return { ...common, type: "conversion_cta" as const, ctaHeadline: scene.voice, trustBadges: ["CLAIM-LINKED", "QA PASSED", "SOURCE READY"] };
      return { ...common, type: "terminal_code" as const, terminalTitle: scene.type.toUpperCase(), terminalCommand: scene.voice, terminalOutput: "Source-linked scene ready.", terminalAlert: "VERIFIED FLOW" };
    }),
  } as CampaignData;
}
