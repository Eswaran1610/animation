/**
 * Script & Scene-Plan generator using Gemini API.
 * Returns schema-validated structured data - never raw shell commands.
 * Retries up to 3 times on malformed output.
 */

import { SourceReference, ScenePlan } from "../jobs/jobStore";
import { z } from "zod";

const ScenePlanItemSchema = z.object({
  id: z.string(),
  durationSeconds: z.number().min(2).max(30),
  component: z.string(),
  narration: z.string(),
  onScreenText: z.string(),
  visualDirection: z.string(),
  sourceIds: z.array(z.string()).default([]),
  type: z.string(),
  headline: z.string().optional(),
  tag: z.string().optional(),
  accentWord: z.string().optional(),
  subtitle: z.string().optional(),
  terminalCommand: z.string().optional(),
  terminalOutput: z.string().optional(),
  terminalAlert: z.string().optional(),
  beforeAfter: z
    .object({
      beforeTitle: z.string(),
      beforeItems: z.array(z.string()),
      afterTitle: z.string(),
      afterItems: z.array(z.string()),
    })
    .optional(),
  items: z.array(z.string()).optional(),
  metricTarget: z.number().optional(),
  metricSuffix: z.string().optional(),
  metricLabel: z.string().optional(),
  secondaryMetricValue: z.string().optional(),
  secondaryMetricLabel: z.string().optional(),
  ctaHeadline: z.string().optional(),
  trustBadges: z.array(z.string()).optional(),
  nodeLeft: z
    .object({ icon: z.string().optional(), label: z.string(), status: z.string(), sub: z.string().optional() })
    .optional(),
  nodeCenter: z
    .object({ icon: z.string().optional(), label: z.string(), sub: z.string(), status: z.string().optional() })
    .optional(),
  nodeRight: z
    .object({ icon: z.string().optional(), label: z.string(), sub: z.string(), status: z.string().optional() })
    .optional(),
});

const ScriptPlanSchema = z.object({
  videoTitle: z.string(),
  targetAudience: z.string(),
  targetDurationSeconds: z.number(),
  fps: z.number().default(60),
  theme: z.string().default("cyber"),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
  brandName: z.string().default("Motion Studio"),
  primaryColor: z.string().default("#10B981"),
  accentColor: z.string().default("#06B6D4"),
  backgroundColor: z.string().default("#030712"),
  narrationScript: z.string(),
  scenes: z.array(ScenePlanItemSchema).min(1),
});

export type StructuredScriptPlan = z.infer<typeof ScriptPlanSchema>;

function buildSystemPrompt(
  instructions: string,
  researchSummary: string,
  sources: SourceReference[],
  settings: {
    targetDurationSeconds: number;
    fps: number;
    aspectRatio: string;
    theme?: string;
    audience?: string;
    style?: string;
  }
): string {
  const sourceList = sources
    .slice(0, 8)
    .map((s) => `- [${s.id}] "${s.title}" (${s.publisher || s.url}) ${s.publicationDate ? `— ${s.publicationDate}` : ""}`)
    .join("\n");

  const lines = instructions
    .split(/\r?\n|;|\|/)
    .map((l) => l.trim())
    .filter(Boolean);

  let storyboardGuidance = "";
  if (lines.length >= 2) {
    storyboardGuidance = `
STORYBOARD DIRECTIVE (User provided a 4-line storyboard):
- Line 1 (Hook / Problem Statement): "${lines[0]}" -> Map to Scene 1 (kinetic_hook)
- Line 2 (Core Solution / Architecture): "${lines[1] || ""}" -> Map to Scene 2 (before_after_split, terminal_code, or feature_cards)
- Line 3 (Impact / Metric / Proof): "${lines[2] || ""}" -> Map to Scene 3 (metric_counter or topology)
- Line 4 (Call to Action / Next Step): "${lines[3] || ""}" -> Map to Scene 4 (conversion_cta)
Turn each line into cinematic motion graphics and punchy typography.
`;
  }

  return `You are a world-class motion graphics creative director and video scriptwriter.
Your job is to turn research + user instructions into a validated JSON scene plan for a Remotion video.

USER INSTRUCTIONS:
${instructions}
${storyboardGuidance}
TARGET AUDIENCE: ${settings.audience || "General tech audience"}
STYLE: ${settings.style || "Cinematic technical motion graphics"}
ASPECT RATIO: ${settings.aspectRatio}
TARGET DURATION: ${settings.targetDurationSeconds}s at ${settings.fps} FPS
THEME: ${settings.theme || "cyber"}

RESEARCH SUMMARY:
${researchSummary}

AVAILABLE SOURCES (use their IDs in sourceIds field):
${sourceList || "(No external sources — use general knowledge only, clearly label uncertainty)"}

SUPPORTED SCENE COMPONENT TYPES (use exactly these strings in "type" field):
- kinetic_hook       → opening title with bold headline
- terminal_code      → animated CLI/terminal window  
- code_terminal      → alias for terminal_code
- before_after_split → left/right split comparison
- feature_cards      → 2–3 feature bullet cards
- metric_counter     → animated number counter
- network_topology   → 3-node architecture diagram
- conversion_cta     → closing call-to-action

CRITICAL RULES:
1. Return ONLY a JSON object matching the schema. No markdown fences.
2. Base ALL factual claims on the research summary. Label uncertainty clearly.
3. Never invent CVE IDs, version numbers, patch dates, or URLs.
4. Scene durations must sum to approximately ${settings.targetDurationSeconds}s total.
5. Every scene needs both "type" (from the list above) AND "component" (same value as type).
6. Keep onScreenText short (< 80 chars). Narration can be longer (< 200 chars/scene).
7. Use sourceIds array to link scenes to sources.
8. Make narration sound natural and spoken (not written). Fit the target audience.
9. Always start with kinetic_hook and end with conversion_cta.

Return JSON matching EXACTLY this schema:
{
  "videoTitle": "string",
  "targetAudience": "string",
  "targetDurationSeconds": number,
  "fps": ${settings.fps},
  "theme": "${settings.theme || "cyber"}",
  "aspectRatio": "${settings.aspectRatio}",
  "brandName": "string",
  "primaryColor": "#hex",
  "accentColor": "#hex",
  "backgroundColor": "#hex",
  "narrationScript": "full spoken narration for the entire video",
  "scenes": [
    {
      "id": "scene-1",
      "type": "kinetic_hook",
      "component": "kinetic_hook",
      "tag": "CATEGORY",
      "headline": "Main headline (max 70 chars)",
      "accentWord": "word",
      "subtitle": "Subtitle (max 100 chars)",
      "narration": "What the narrator says during this scene",
      "onScreenText": "Short text shown on screen",
      "visualDirection": "Describe the visual treatment",
      "sourceIds": [],
      "durationSeconds": 5
    }
    // ... more scenes
  ]
}`;
}

export async function generateScriptPlan(
  instructions: string,
  researchSummary: string,
  sources: SourceReference[],
  settings: {
    targetDurationSeconds: number;
    fps: number;
    aspectRatio: string;
    theme?: string;
    audience?: string;
    style?: string;
    geminiApiKey?: string;
  }
): Promise<StructuredScriptPlan> {
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

  const systemPrompt = buildSystemPrompt(instructions, researchSummary, sources, settings);

  // Try Gemini if API key available
  if (apiKey && apiKey.trim().length > 10) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[ScriptGen] Gemini attempt ${attempt}/3...`);
        const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey.trim() },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: systemPrompt }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.3,
              maxOutputTokens: 4096,
            },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`[ScriptGen] Gemini API error (${res.status}):`, errText.slice(0, 200));
          continue;
        }

        const data: any = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        const cleanText = rawText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanText);

        // Validate against schema (reject malformed)
        const validated = ScriptPlanSchema.parse(parsed);
        console.log(`[ScriptGen] Generated ${validated.scenes.length} scenes.`);
        return validated;
      } catch (err: any) {
        console.warn(`[ScriptGen] Attempt ${attempt} failed:`, err.message?.slice(0, 100));
        if (attempt === 3) break;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
    console.warn("[ScriptGen] All Gemini attempts failed. Using fallback generator.");
  }

  // Fallback: deterministic local plan based on topic
  return generateFallbackPlan(instructions, sources, settings);
}

function generateFallbackPlan(
  instructions: string,
  sources: SourceReference[],
  settings: {
    targetDurationSeconds: number;
    fps: number;
    aspectRatio: string;
    theme?: string;
    audience?: string;
  }
): StructuredScriptPlan {
  const theme = settings.theme || "cyber";
  const colors: Record<string, { primary: string; accent: string; bg: string }> = {
    cyber: { primary: "#10B981", accent: "#06B6D4", bg: "#030712" },
    claude: { primary: "#D97757", accent: "#F5F1E8", bg: "#1A1916" },
    fintech: { primary: "#F59E0B", accent: "#10B981", bg: "#080C14" },
    indigo: { primary: "#6366F1", accent: "#EC4899", bg: "#030712" },
  };
  const c = colors[theme] || colors.cyber;
  // Parse lines if user provided multi-line storyboard (3 to 7 lines)
  const lines = instructions
    .split(/\r?\n|;|\|/)
    .map((l) => l.trim())
    .filter(Boolean);

  const effectiveLines = lines.length >= 2 ? lines : [
    instructions.slice(0, 60),
    "Automated Code-Driven Architecture",
    "95% Production Impact Verified",
    "Deploy Your Video Pipeline Today →",
  ];

  const topicSlug = effectiveLines[0].slice(0, 60);
  const srcIds = sources.slice(0, 3).map((s) => s.id);
  const numScenes = effectiveLines.length;

  const targetTotal = Math.max(15, settings.targetDurationSeconds || Math.max(15, numScenes * 4));
  const perSceneSeconds = Math.min(28, Math.max(3, Math.round(targetTotal / numScenes)));

  const scenes: any[] = [];

  effectiveLines.forEach((line, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === numScenes - 1;
    const lLower = line.toLowerCase();
    const duration = perSceneSeconds;

    if (isFirst) {
      // Scene 1: Always kinetic hook
      scenes.push({
        id: `s_${idx + 1}`,
        type: "kinetic_hook",
        component: "kinetic_hook",
        tag: lLower.includes("php") ? "PHP VULNERABILITY ALERT" : "THE HOOK",
        headline: line.slice(0, 70),
        accentWord: line.split(" ")[0] || "Alert",
        subtitle: "Verified Technical Motion Breakdown",
        narration: line,
        onScreenText: line.slice(0, 60),
        visualDirection: "Bold kinetic title with particle effects",
        sourceIds: [],
        durationSeconds: duration,
      });
    } else if (isLast) {
      // Final Scene: Always conversion CTA
      scenes.push({
        id: `s_${idx + 1}`,
        type: "conversion_cta",
        component: "conversion_cta",
        tag: "TAKE ACTION",
        headline: line.slice(0, 70),
        accentWord: line.split(" ")[0] || "Update",
        ctaHeadline: line.slice(0, 40),
        trustBadges: lLower.includes("php") ? ["PATCH AVAILABLE", "60 FPS", "VERIFIED ADVISORY"] : ["100% CODE-DRIVEN", "60 FPS", "VERIFIED MOTION"],
        narration: line,
        onScreenText: line.slice(0, 60),
        visualDirection: "Pulsing CTA with security trust badges",
        sourceIds: [],
        durationSeconds: duration,
      });
    } else {
      // Intermediate Scenes: Auto-detect best visual archetype
      const hasNumbers = /\d+[%xmsKMBkmb]?/.test(line);
      const isTerminal = lLower.includes("code") || lLower.includes("cli") || lLower.includes("terminal") || lLower.includes("cve") || lLower.includes("patch") || lLower.includes("exploit") || lLower.includes("php") || lLower.includes("cgi") || lLower.includes("run") || lLower.includes("deploy");
      const isCompare = lLower.includes("vs") || lLower.includes("compare") || lLower.includes("replace") || lLower.includes("legacy") || lLower.includes("vulnerable");
      const isTopology = lLower.includes("network") || lLower.includes("server") || lLower.includes("cloud") || lLower.includes("architecture") || lLower.includes("mesh");

      if (isCompare) {
        scenes.push({
          id: `s_${idx + 1}`,
          type: "before_after_split",
          component: "before_after_split",
          tag: "EXPLOIT VS PATCH",
          headline: line.slice(0, 70),
          accentWord: line.split(" ")[0],
          subtitle: "Comparison of affected vs patched posture.",
          narration: line,
          onScreenText: line.slice(0, 60),
          visualDirection: "Split comparison screen",
          sourceIds: srcIds,
          beforeAfter: {
            beforeTitle: "Vulnerable State",
            beforeItems: ["Unpatched CGI Environment", "Remote Command Injection", "Full Server Compromise"],
            afterTitle: "Mitigated State",
            afterItems: ["PHP Security Update Applied", "Query Param Sanitization", "Zero Lateral Movement"],
          },
          durationSeconds: duration,
        });
      } else if (isTerminal) {
        scenes.push({
          id: `s_${idx + 1}`,
          type: "terminal_code",
          component: "terminal_code",
          tag: "VERIFICATION & MITIGATION",
          headline: line.slice(0, 70),
          accentWord: line.split(" ")[0],
          subtitle: "Command-line execution and patch verification.",
          narration: line,
          onScreenText: line.slice(0, 60),
          visualDirection: "Animated terminal code window",
          sourceIds: srcIds,
          terminalTitle: "bash — php_verify.sh",
          terminalCommand: lLower.includes("php") ? "php -v && check-cve-2024-4577 --strict" : line.length < 50 ? line : "security audit --verify",
          terminalOutput: "✔ Verified: Security patch active. No vulnerabilities found.",
          terminalAlert: "PATCH VERIFIED: 100% Secure",
          durationSeconds: duration,
        });
      } else if (hasNumbers) {
        const numMatch = line.match(/\d+/);
        const targetNum = numMatch ? parseInt(numMatch[0]) : 95;
        scenes.push({
          id: `s_${idx + 1}`,
          type: "metric_counter",
          component: "metric_counter",
          tag: "MEASURED IMPACT",
          headline: line.slice(0, 70),
          accentWord: line.split(" ")[0],
          narration: line,
          onScreenText: line.slice(0, 60),
          visualDirection: "Animated counter with SVG ring gauge",
          sourceIds: srcIds,
          metricTarget: targetNum,
          metricSuffix: line.includes("%") ? "%" : line.includes("x") ? "x" : line.includes("ms") ? "ms" : "",
          metricLabel: line.slice(0, 35),
          secondaryMetricValue: "0",
          secondaryMetricLabel: "Remaining Risk",
          durationSeconds: duration,
        });
      } else {
        scenes.push({
          id: `s_${idx + 1}`,
          type: "feature_cards",
          component: "feature_cards",
          tag: "KEY TAKEAWAY",
          headline: line.slice(0, 70),
          accentWord: line.split(" ")[0],
          narration: line,
          onScreenText: line.slice(0, 60),
          visualDirection: "Staggered feature cards",
          sourceIds: srcIds,
          items: [
            line,
            "Immediate patch update recommended",
            "Continuous automated vulnerability scan",
          ],
          durationSeconds: duration,
        });
      }
    }
  });

  const totalDuration = scenes.reduce((a, b) => a + b.durationSeconds, 0);

  return ScriptPlanSchema.parse({
    videoTitle: topicSlug,
    targetAudience: settings.audience || "Tech professionals",
    targetDurationSeconds: totalDuration,
    fps: settings.fps,
    theme,
    aspectRatio: settings.aspectRatio as "9:16" | "16:9" | "1:1",
    brandName: lLowerTheme(theme, effectiveLines[0]),
    primaryColor: c.primary,
    accentColor: c.accent,
    backgroundColor: c.bg,
    narrationScript: effectiveLines.join(". "),
    scenes,
  });
}

function lLowerTheme(theme: string, firstLine: string): string {
  if (firstLine.toLowerCase().includes("php")) return "PHP Security";
  if (theme === "claude") return "Claude Code";
  if (theme === "fintech") return "FinPulse";
  if (theme === "indigo") return "Modern SaaS";
  return "Sentinel Cyber";
}
