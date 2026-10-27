import { CampaignConfig } from "./schema";

export const defaultCampaign: CampaignConfig = {
  id: "motion-engine-saas",
  brand: {
    name: "Aura AI",
    tagline: "Autonomous Creative Studio",
    primaryColor: "#6366F1", // Indigo
    secondaryColor: "#1E1B4B",
    accentColor: "#06B6D4", // Cyan
    bgColor: "#090D16",
    textColor: "#F8FAFC",
  },
  metrics: {
    metricValue: "10x",
    metricLabel: "Faster Video Production Pipeline",
  },
  features: [
    "Code-Driven Deterministic Frames",
    "Auto-Generated Multi-Format Variants",
    "Real-time Brand Token Swapping",
  ],
  hookText: "Stop generating random AI video.\nBuild motion from code.",
  ctaText: "Start Building with Aura",
  ctaSubtext: "Ship high-converting videos in minutes",
  aspectRatio: "16:9",
};
