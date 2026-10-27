import { CampaignData } from "./schema";

const GEMINI_SYSTEM_PROMPT = `You are a world-class Motion Graphics Creative Director for high-converting vertical (1080x1920 9:16) tech videos.
Your task is to convert a user prompt or product idea into a structured JSON campaign for Remotion.

CRITICAL CREATIVE RULES:
1. NO GENERIC CORPORATE FILLER. Avoid phrases like "Legacy systems cannot keep up" or "Built for mission critical scale".
2. PUNCHY, SPECIFIC COPY: Use real technical terms, authentic product names, and sharp 3-5 word headlines.
3. KINETIC CHOREOGRAPHY:
   - Always start with a striking hook (kinetic_hook).
   - If comparing old vs new, use 'before_after_split'.
   - If it involves CLI, terminal, AI agents, or dev tools, use 'code_terminal' with realistic commands.
   - If it involves infra, cloud, or security, use 'network_topology'.
   - If it has stats or ROI, use 'metric_counter'.
   - Always end with a punchy conversion CTA (conversion_cta).
4. THEME MATCHING:
   - "claude": warm terracotta (#D97757), cream (#F5F1E8), deep dark background (#1A1916).
   - "cyber": neon emerald (#10B981), cyan (#06B6D4), obsidian background (#030712).
   - "fintech": gold (#F59E0B), emerald (#10B981), obsidian background (#080C14).
   - "indigo": electric indigo (#6366F1), pink (#EC4899), dark slate (#030712).

RETURN ONLY RAW JSON matching this structure:
{
  "campaignId": "slug_id",
  "title": "Short Title",
  "aspectRatio": "9:16",
  "ctaText": "Try Now →",
  "brand": {
    "name": "Product Name",
    "primaryColor": "#HEX",
    "accentColor": "#HEX",
    "backgroundColor": "#HEX",
    "theme": "claude" | "cyber" | "fintech" | "indigo"
  },
  "scenes": [
    // 3 to 5 scenes max:
    // Scene 1: kinetic_hook { id, type: "kinetic_hook", tag, headline, accentWord, subtitle, durationSeconds: 4-5 }
    // Scene 2: before_after_split { id, type: "before_after_split", tag, headline, accentWord, beforeAfter: { beforeTitle, beforeItems: [3 items], afterTitle, afterItems: [3 items] }, durationSeconds: 5-6 }
    // Scene 3: code_terminal { id, type: "code_terminal", tag, headline, accentWord, terminalTitle, terminalCommand, terminalOutput, terminalAlert, durationSeconds: 5-6 }
    // Scene 4: metric_counter { id, type: "metric_counter", tag, headline, accentWord, metricTarget: number, metricSuffix: "%"|"x"|"ms", metricLabel, secondaryMetricValue, secondaryMetricLabel, durationSeconds: 4-5 }
    // Scene 5: conversion_cta { id, type: "conversion_cta", tag, headline, accentWord, ctaHeadline, trustBadges: [3 badges], durationSeconds: 4 }
  ]
}
`;

export async function askGemini(prompt: string, apiKey?: string): Promise<CampaignData | null> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key || key === "your-api-key-here" || key.trim() === "") {
    return null;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key.trim()}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Gemini Director] API Error (${response.status}):`, errText);
      return null;
    }

    const data: any = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText);
    if (!parsed.scenes || !Array.isArray(parsed.scenes)) return null;

    parsed.campaignId = `gemini_${Date.now()}`;
    return parsed as CampaignData;
  } catch (error) {
    console.error("[Gemini Director] Generation exception:", error);
    return null;
  }
}
